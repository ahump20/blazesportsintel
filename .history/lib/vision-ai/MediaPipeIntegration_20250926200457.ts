/**
 * Blaze Sports Intelligence - MediaPipe Integration
 * Championship Intelligence Platform - Computer Vision System
 * The Deep South's Sports Intelligence Hub
 */

import { 
  PoseMetrics, 
  BiomechanicalAnalysis, 
  CharacterAssessment,
  VisionAIMode 
} from '@/types/sports.types';

// MediaPipe configuration interface
interface MediaPipeConfig {
  modelComplexity: 0 | 1 | 2;
  smoothLandmarks: boolean;
  enableSegmentation: boolean;
  minDetectionConfidence: number;
  minTrackingConfidence: number;
  staticImageMode: boolean;
  selfieMode: boolean;
  refineLandmarks: boolean;
  enableFaceLandmarks: boolean;
  enableHandLandmarks: boolean;
  enablePoseLandmarks: boolean;
}

// MediaPipe results interface
interface MediaPipeResults {
  poseLandmarks?: Array<{
    x: number;
    y: number;
    z: number;
    visibility: number;
  }>;
  faceLandmarks?: Array<{
    x: number;
    y: number;
    z: number;
    visibility: number;
  }>;
  handLandmarks?: Array<{
    x: number;
    y: number;
    z: number;
    visibility: number;
  }>;
  segmentation?: {
    mask: ImageData;
    confidence: number;
  };
  timestamp: number;
  confidence: number;
}

// Pose keypoint mapping
const POSE_KEYPOINTS = [
  'nose', 'left_eye_inner', 'left_eye', 'left_eye_outer',
  'right_eye_inner', 'right_eye', 'right_eye_outer',
  'left_ear', 'right_ear', 'mouth_left', 'mouth_right',
  'left_shoulder', 'right_shoulder', 'left_elbow', 'right_elbow',
  'left_wrist', 'right_wrist', 'left_pinky', 'right_pinky',
  'left_index', 'right_index', 'left_thumb', 'right_thumb',
  'left_hip', 'right_hip', 'left_knee', 'right_knee',
  'left_ankle', 'right_ankle', 'left_heel', 'right_heel',
  'left_foot_index', 'right_foot_index'
];

// Face keypoint mapping
const FACE_KEYPOINTS = [
  'face_oval', 'left_eye', 'right_eye', 'left_eyebrow', 'right_eyebrow',
  'nose', 'mouth', 'upper_lip', 'lower_lip'
];

// Hand keypoint mapping
const HAND_KEYPOINTS = [
  'wrist', 'thumb_cmc', 'thumb_mcp', 'thumb_ip', 'thumb_tip',
  'index_finger_mcp', 'index_finger_pip', 'index_finger_dip', 'index_finger_tip',
  'middle_finger_mcp', 'middle_finger_pip', 'middle_finger_dip', 'middle_finger_tip',
  'ring_finger_mcp', 'ring_finger_pip', 'ring_finger_dip', 'ring_finger_tip',
  'pinky_mcp', 'pinky_pip', 'pinky_dip', 'pinky_tip'
];

// Default configuration
const DEFAULT_CONFIG: MediaPipeConfig = {
  modelComplexity: 1,
  smoothLandmarks: true,
  enableSegmentation: false,
  minDetectionConfidence: 0.7,
  minTrackingConfidence: 0.7,
  staticImageMode: false,
  selfieMode: true,
  refineLandmarks: true,
  enableFaceLandmarks: true,
  enableHandLandmarks: true,
  enablePoseLandmarks: true
};

/**
 * MediaPipe Integration Class
 * Handles all MediaPipe functionality for pose detection, face analysis, and hand tracking
 */
export class MediaPipeIntegration {
  private config: MediaPipeConfig;
  private isInitialized: boolean = false;
  private isProcessing: boolean = false;
  private pose: any = null;
  private faceMesh: any = null;
  private hands: any = null;
  private selfieSegmentation: any = null;
  private video: HTMLVideoElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private context: CanvasRenderingContext2D | null = null;
  
  // Performance tracking
  private performanceMetrics = {
    fps: 0,
    processingTime: 0,
    detectionTime: 0,
    trackingTime: 0,
    lastFrameTime: 0,
    frameCount: 0
  };
  
  // Results cache
  private lastResults: MediaPipeResults | null = null;
  private resultsHistory: MediaPipeResults[] = [];
  private maxHistorySize: number = 30; // 1 second at 30fps
  
  // Event system
  private eventListeners: Map<string, Array<(data: any) => void>> = new Map();
  
  constructor(config: Partial<MediaPipeConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }
  
  /**
   * Initialize MediaPipe
   */
  async initialize(): Promise<void> {
    try {
      // Check if MediaPipe is available
      if (typeof window === 'undefined' || !window.navigator.mediaDevices) {
        throw new Error('MediaPipe requires a browser environment with camera access');
      }
      
      // Initialize MediaPipe solutions
      await this.initializeMediaPipeSolutions();
      
      // Create canvas for drawing
      this.createCanvas();
      
      this.isInitialized = true;
      this.emit('initialized', { config: this.config });
      
      console.log('MediaPipe Integration initialized successfully');
    } catch (error) {
      console.error('Failed to initialize MediaPipe Integration:', error);
      throw error;
    }
  }
  
  /**
   * Initialize MediaPipe solutions
   */
  private async initializeMediaPipeSolutions(): Promise<void> {
    // Initialize Pose solution
    if (this.config.enablePoseLandmarks) {
      this.pose = new (window as any).mediapipePose.Pose({
        locateFile: (file: string) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
        }
      });
      
      this.pose.setOptions({
        modelComplexity: this.config.modelComplexity,
        smoothLandmarks: this.config.smoothLandmarks,
        enableSegmentation: this.config.enableSegmentation,
        minDetectionConfidence: this.config.minDetectionConfidence,
        minTrackingConfidence: this.config.minTrackingConfidence,
        selfieMode: this.config.selfieMode,
        refineLandmarks: this.config.refineLandmarks
      });
      
      this.pose.onResults((results: any) => {
        this.handlePoseResults(results);
      });
    }
    
    // Initialize Face Mesh solution
    if (this.config.enableFaceLandmarks) {
      this.faceMesh = new (window as any).mediapipeFaceMesh.FaceMesh({
        locateFile: (file: string) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
        }
      });
      
      this.faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: this.config.refineLandmarks,
        minDetectionConfidence: this.config.minDetectionConfidence,
        minTrackingConfidence: this.config.minTrackingConfidence
      });
      
      this.faceMesh.onResults((results: any) => {
        this.handleFaceResults(results);
      });
    }
    
    // Initialize Hands solution
    if (this.config.enableHandLandmarks) {
      this.hands = new (window as any).mediapipeHands.Hands({
        locateFile: (file: string) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
        }
      });
      
      this.hands.setOptions({
        maxNumHands: 2,
        minDetectionConfidence: this.config.minDetectionConfidence,
        minTrackingConfidence: this.config.minTrackingConfidence
      });
      
      this.hands.onResults((results: any) => {
        this.handleHandResults(results);
      });
    }
    
    // Initialize Selfie Segmentation
    if (this.config.enableSegmentation) {
      this.selfieSegmentation = new (window as any).mediapipeSelfieSegmentation.SelfieSegmentation({
        locateFile: (file: string) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`;
        }
      });
      
      this.selfieSegmentation.setOptions({
        modelSelection: 1, // 0 for general model, 1 for landscape model
        selfieMode: this.config.selfieMode
      });
      
      this.selfieSegmentation.onResults((results: any) => {
        this.handleSegmentationResults(results);
      });
    }
  }
  
  /**
   * Create canvas for drawing
   */
  private createCanvas(): void {
    this.canvas = document.createElement('canvas');
    this.context = this.canvas.getContext('2d');
    
    if (!this.context) {
      throw new Error('Failed to create canvas context');
    }
  }
  
  /**
   * Process frame through MediaPipe
   */
  async processFrame(video: HTMLVideoElement): Promise<MediaPipeResults | null> {
    if (!this.isInitialized || this.isProcessing) {
      return null;
    }
    
    this.isProcessing = true;
    const startTime = performance.now();
    
    try {
      // Update canvas size to match video
      if (this.canvas && this.context) {
        this.canvas.width = video.videoWidth;
        this.canvas.height = video.videoHeight;
      }
      
      // Process through MediaPipe solutions
      const results: MediaPipeResults = {
        timestamp: performance.now(),
        confidence: 0
      };
      
      // Process pose
      if (this.pose && this.config.enablePoseLandmarks) {
        await this.processPose(video, results);
      }
      
      // Process face
      if (this.faceMesh && this.config.enableFaceLandmarks) {
        await this.processFace(video, results);
      }
      
      // Process hands
      if (this.hands && this.config.enableHandLandmarks) {
        await this.processHands(video, results);
      }
      
      // Process segmentation
      if (this.selfieSegmentation && this.config.enableSegmentation) {
        await this.processSegmentation(video, results);
      }
      
      // Calculate overall confidence
      results.confidence = this.calculateOverallConfidence(results);
      
      // Update performance metrics
      this.updatePerformanceMetrics(startTime);
      
      // Store results
      this.lastResults = results;
      this.resultsHistory.push(results);
      if (this.resultsHistory.length > this.maxHistorySize) {
        this.resultsHistory.shift();
      }
      
      // Emit results
      this.emit('results', results);
      
      return results;
    } catch (error) {
      console.error('Error processing frame:', error);
      return null;
    } finally {
      this.isProcessing = false;
    }
  }
  
  /**
   * Process pose detection
   */
  private async processPose(video: HTMLVideoElement, results: MediaPipeResults): Promise<void> {
    return new Promise((resolve) => {
      this.pose.send({ image: video });
      resolve();
    });
  }
  
  /**
   * Process face detection
   */
  private async processFace(video: HTMLVideoElement, results: MediaPipeResults): Promise<void> {
    return new Promise((resolve) => {
      this.faceMesh.send({ image: video });
      resolve();
    });
  }
  
  /**
   * Process hand detection
   */
  private async processHands(video: HTMLVideoElement, results: MediaPipeResults): Promise<void> {
    return new Promise((resolve) => {
      this.hands.send({ image: video });
      resolve();
    });
  }
  
  /**
   * Process segmentation
   */
  private async processSegmentation(video: HTMLVideoElement, results: MediaPipeResults): Promise<void> {
    return new Promise((resolve) => {
      this.selfieSegmentation.send({ image: video });
      resolve();
    });
  }
  
  /**
   * Handle pose results
   */
  private handlePoseResults(results: any): void {
    if (results.poseLandmarks) {
      this.lastResults = {
        ...this.lastResults,
        poseLandmarks: results.poseLandmarks,
        timestamp: performance.now()
      };
      
      this.emit('poseResults', results.poseLandmarks);
    }
  }
  
  /**
   * Handle face results
   */
  private handleFaceResults(results: any): void {
    if (results.multiFaceLandmarks) {
      this.lastResults = {
        ...this.lastResults,
        faceLandmarks: results.multiFaceLandmarks[0],
        timestamp: performance.now()
      };
      
      this.emit('faceResults', results.multiFaceLandmarks[0]);
    }
  }
  
  /**
   * Handle hand results
   */
  private handleHandResults(results: any): void {
    if (results.multiHandLandmarks) {
      this.lastResults = {
        ...this.lastResults,
        handLandmarks: results.multiHandLandmarks[0],
        timestamp: performance.now()
      };
      
      this.emit('handResults', results.multiHandLandmarks[0]);
    }
  }
  
  /**
   * Handle segmentation results
   */
  private handleSegmentationResults(results: any): void {
    if (results.segmentationMask) {
      this.lastResults = {
        ...this.lastResults,
        segmentation: {
          mask: results.segmentationMask,
          confidence: results.confidence || 0.8
        },
        timestamp: performance.now()
      };
      
      this.emit('segmentationResults', results.segmentationMask);
    }
  }
  
  /**
   * Calculate overall confidence
   */
  private calculateOverallConfidence(results: MediaPipeResults): number {
    let totalConfidence = 0;
    let confidenceCount = 0;
    
    if (results.poseLandmarks) {
      const poseConfidence = results.poseLandmarks.reduce((sum, landmark) => 
        sum + (landmark.visibility || 0), 0) / results.poseLandmarks.length;
      totalConfidence += poseConfidence;
      confidenceCount++;
    }
    
    if (results.faceLandmarks) {
      const faceConfidence = results.faceLandmarks.reduce((sum, landmark) => 
        sum + (landmark.visibility || 0), 0) / results.faceLandmarks.length;
      totalConfidence += faceConfidence;
      confidenceCount++;
    }
    
    if (results.handLandmarks) {
      const handConfidence = results.handLandmarks.reduce((sum, landmark) => 
        sum + (landmark.visibility || 0), 0) / results.handLandmarks.length;
      totalConfidence += handConfidence;
      confidenceCount++;
    }
    
    if (results.segmentation) {
      totalConfidence += results.segmentation.confidence;
      confidenceCount++;
    }
    
    return confidenceCount > 0 ? totalConfidence / confidenceCount : 0;
  }
  
  /**
   * Update performance metrics
   */
  private updatePerformanceMetrics(startTime: number): void {
    const processingTime = performance.now() - startTime;
    
    this.performanceMetrics.frameCount++;
    this.performanceMetrics.processingTime = processingTime;
    
    // Calculate FPS
    const currentTime = performance.now();
    if (this.performanceMetrics.lastFrameTime > 0) {
      const frameTime = currentTime - this.performanceMetrics.lastFrameTime;
      this.performanceMetrics.fps = 1000 / frameTime;
    }
    this.performanceMetrics.lastFrameTime = currentTime;
  }
  
  /**
   * Calculate pose metrics from MediaPipe results
   */
  calculatePoseMetrics(results: MediaPipeResults): PoseMetrics {
    if (!results.poseLandmarks || results.poseLandmarks.length === 0) {
      return this.getDefaultPoseMetrics();
    }
    
    const landmarks = results.poseLandmarks;
    
    // Extract key points
    const keyPoints = landmarks.map((landmark, index) => ({
      name: POSE_KEYPOINTS[index] || `keypoint_${index}`,
      x: landmark.x,
      y: landmark.y,
      z: landmark.z || 0,
      confidence: landmark.visibility || 0
    }));
    
    // Calculate angles between joints
    const angles = this.calculateJointAngles(landmarks);
    
    // Calculate velocities and accelerations
    const velocities = this.calculateVelocities(landmarks);
    const accelerations = this.calculateAccelerations(velocities);
    
    // Calculate biomechanical metrics
    const hipRotation = this.calculateHipRotation(landmarks);
    const shoulderTilt = this.calculateShoulderTilt(landmarks);
    const weightTransfer = this.calculateWeightTransfer(landmarks);
    const formScore = this.calculateFormScore(landmarks, angles);
    const confidence = this.calculateOverallConfidence(results);
    const biomechanicalEfficiency = this.calculateBiomechanicalEfficiency(angles, velocities);
    const injuryRisk = this.calculateInjuryRisk(landmarks, angles, velocities);
    const performanceIndex = this.calculatePerformanceIndex(formScore, biomechanicalEfficiency, injuryRisk);
    
    return {
      hipRotation,
      shoulderTilt,
      weightTransfer,
      formScore,
      confidence,
      biomechanicalEfficiency,
      injuryRisk,
      performanceIndex,
      keyPoints,
      angles,
      velocities,
      accelerations
    };
  }
  
  /**
   * Calculate joint angles
   */
  private calculateJointAngles(landmarks: any[]): Record<string, number> {
    const angles: Record<string, number> = {};
    
    // Left elbow angle
    if (landmarks[11] && landmarks[13] && landmarks[15]) {
      angles.leftElbow = this.calculateAngle(landmarks[11], landmarks[13], landmarks[15]);
    }
    
    // Right elbow angle
    if (landmarks[12] && landmarks[14] && landmarks[16]) {
      angles.rightElbow = this.calculateAngle(landmarks[12], landmarks[14], landmarks[16]);
    }
    
    // Left knee angle
    if (landmarks[23] && landmarks[25] && landmarks[27]) {
      angles.leftKnee = this.calculateAngle(landmarks[23], landmarks[25], landmarks[27]);
    }
    
    // Right knee angle
    if (landmarks[24] && landmarks[26] && landmarks[28]) {
      angles.rightKnee = this.calculateAngle(landmarks[24], landmarks[26], landmarks[28]);
    }
    
    // Left shoulder angle
    if (landmarks[13] && landmarks[11] && landmarks[23]) {
      angles.leftShoulder = this.calculateAngle(landmarks[13], landmarks[11], landmarks[23]);
    }
    
    // Right shoulder angle
    if (landmarks[14] && landmarks[12] && landmarks[24]) {
      angles.rightShoulder = this.calculateAngle(landmarks[14], landmarks[12], landmarks[24]);
    }
    
    return angles;
  }
  
  /**
   * Calculate angle between three points
   */
  private calculateAngle(point1: any, point2: any, point3: any): number {
    const radians = Math.atan2(point3.y - point2.y, point3.x - point2.x) - 
                   Math.atan2(point1.y - point2.y, point1.x - point2.x);
    return Math.abs(radians * 180 / Math.PI);
  }
  
  /**
   * Calculate velocities
   */
  private calculateVelocities(landmarks: any[]): Record<string, number> {
    // This would require previous frame data for real velocity calculation
    // For now, return empty object
    return {};
  }
  
  /**
   * Calculate accelerations
   */
  private calculateAccelerations(velocities: Record<string, number>): Record<string, number> {
    // This would require previous velocity data for real acceleration calculation
    // For now, return empty object
    return {};
  }
  
  /**
   * Calculate hip rotation
   */
  private calculateHipRotation(landmarks: any[]): number {
    if (landmarks.length < 24) return 0;
    
    const leftHip = landmarks[23];
    const rightHip = landmarks[24];
    
    if (!leftHip || !rightHip) return 0;
    
    const angle = Math.atan2(rightHip.y - leftHip.y, rightHip.x - leftHip.x);
    return Math.abs(angle * 180 / Math.PI);
  }
  
  /**
   * Calculate shoulder tilt
   */
  private calculateShoulderTilt(landmarks: any[]): number {
    if (landmarks.length < 12) return 0;
    
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    
    if (!leftShoulder || !rightShoulder) return 0;
    
    const angle = Math.atan2(rightShoulder.y - leftShoulder.y, rightShoulder.x - leftShoulder.x);
    return Math.abs(angle * 180 / Math.PI);
  }
  
  /**
   * Calculate weight transfer
   */
  private calculateWeightTransfer(landmarks: any[]): number {
    if (landmarks.length < 28) return 0;
    
    const leftAnkle = landmarks[27];
    const rightAnkle = landmarks[28];
    
    if (!leftAnkle || !rightAnkle) return 0;
    
    // Simplified weight transfer calculation
    const leftWeight = leftAnkle.visibility || 0;
    const rightWeight = rightAnkle.visibility || 0;
    const totalWeight = leftWeight + rightWeight;
    
    if (totalWeight === 0) return 50; // Default to 50% if no data
    
    return (rightWeight / totalWeight) * 100;
  }
  
  /**
   * Calculate form score
   */
  private calculateFormScore(landmarks: any[], angles: Record<string, number>): number {
    let score = 100;
    
    // Deduct points for poor angles
    Object.values(angles).forEach(angle => {
      if (angle < 30 || angle > 150) {
        score -= 10;
      }
    });
    
    // Deduct points for poor visibility
    const avgVisibility = landmarks.reduce((sum, landmark) => 
      sum + (landmark.visibility || 0), 0) / landmarks.length;
    
    if (avgVisibility < 0.5) {
      score -= 20;
    }
    
    return Math.max(0, Math.min(100, score));
  }
  
  /**
   * Calculate biomechanical efficiency
   */
  private calculateBiomechanicalEfficiency(
    angles: Record<string, number>, 
    velocities: Record<string, number>
  ): number {
    // Simplified efficiency calculation
    const angleEfficiency = Object.values(angles).reduce((sum, angle) => {
      // Ideal angles are around 90 degrees for most joints
      const deviation = Math.abs(angle - 90);
      return sum + Math.max(0, 1 - deviation / 90);
    }, 0) / Object.keys(angles).length;
    
    return angleEfficiency;
  }
  
  /**
   * Calculate injury risk
   */
  private calculateInjuryRisk(
    landmarks: any[], 
    angles: Record<string, number>, 
    velocities: Record<string, number>
  ): number {
    let risk = 0;
    
    // Check for dangerous angles
    Object.values(angles).forEach(angle => {
      if (angle < 15 || angle > 165) {
        risk += 0.2;
      }
    });
    
    // Check for poor visibility (indicating tracking issues)
    const avgVisibility = landmarks.reduce((sum, landmark) => 
      sum + (landmark.visibility || 0), 0) / landmarks.length;
    
    if (avgVisibility < 0.3) {
      risk += 0.3;
    }
    
    return Math.min(1, risk);
  }
  
  /**
   * Calculate performance index
   */
  private calculatePerformanceIndex(
    formScore: number, 
    biomechanicalEfficiency: number, 
    injuryRisk: number
  ): number {
    return (formScore / 100 * 0.4) + 
           (biomechanicalEfficiency * 0.4) + 
           ((1 - injuryRisk) * 0.2);
  }
  
  /**
   * Get default pose metrics
   */
  private getDefaultPoseMetrics(): PoseMetrics {
    return {
      hipRotation: 0,
      shoulderTilt: 0,
      weightTransfer: 0,
      formScore: 100,
      confidence: 0,
      biomechanicalEfficiency: 0,
      injuryRisk: 0,
      performanceIndex: 0,
      keyPoints: [],
      angles: {},
      velocities: {},
      accelerations: {}
    };
  }
  
  /**
   * Draw pose landmarks on canvas
   */
  drawPoseLandmarks(canvas: HTMLCanvasElement, landmarks: any[]): void {
    if (!this.context || !landmarks) return;
    
    const ctx = this.context;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw landmarks
    landmarks.forEach((landmark, index) => {
      if (landmark.visibility && landmark.visibility > 0.5) {
        const x = landmark.x * canvas.width;
        const y = landmark.y * canvas.height;
        
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, 2 * Math.PI);
        ctx.fillStyle = '#FF0000';
        ctx.fill();
        
        // Draw keypoint name
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '12px Arial';
        ctx.fillText(POSE_KEYPOINTS[index] || `P${index}`, x + 5, y - 5);
      }
    });
    
    // Draw connections
    this.drawPoseConnections(ctx, landmarks, canvas.width, canvas.height);
  }
  
  /**
   * Draw pose connections
   */
  private drawPoseConnections(
    ctx: CanvasRenderingContext2D, 
    landmarks: any[], 
    width: number, 
    height: number
  ): void {
    const connections = [
      [11, 12], [11, 13], [13, 15], [12, 14], [14, 16], // Arms
      [11, 23], [12, 24], [23, 24], // Torso
      [23, 25], [25, 27], [24, 26], [26, 28], // Legs
      [27, 31], [28, 32], [31, 32] // Feet
    ];
    
    ctx.strokeStyle = '#00FF00';
    ctx.lineWidth = 2;
    
    connections.forEach(([start, end]) => {
      if (landmarks[start] && landmarks[end] && 
          landmarks[start].visibility > 0.5 && landmarks[end].visibility > 0.5) {
        
        const startX = landmarks[start].x * width;
        const startY = landmarks[start].y * height;
        const endX = landmarks[end].x * width;
        const endY = landmarks[end].y * height;
        
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
      }
    });
  }
  
  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): typeof this.performanceMetrics {
    return { ...this.performanceMetrics };
  }
  
  /**
   * Get last results
   */
  getLastResults(): MediaPipeResults | null {
    return this.lastResults;
  }
  
  /**
   * Get results history
   */
  getResultsHistory(): MediaPipeResults[] {
    return [...this.resultsHistory];
  }
  
  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<MediaPipeConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Update MediaPipe solutions with new config
    if (this.pose) {
      this.pose.setOptions({
        modelComplexity: this.config.modelComplexity,
        smoothLandmarks: this.config.smoothLandmarks,
        enableSegmentation: this.config.enableSegmentation,
        minDetectionConfidence: this.config.minDetectionConfidence,
        minTrackingConfidence: this.config.minTrackingConfidence,
        selfieMode: this.config.selfieMode,
        refineLandmarks: this.config.refineLandmarks
      });
    }
    
    if (this.faceMesh) {
      this.faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: this.config.refineLandmarks,
        minDetectionConfidence: this.config.minDetectionConfidence,
        minTrackingConfidence: this.config.minTrackingConfidence
      });
    }
    
    if (this.hands) {
      this.hands.setOptions({
        maxNumHands: 2,
        minDetectionConfidence: this.config.minDetectionConfidence,
        minTrackingConfidence: this.config.minTrackingConfidence
      });
    }
    
    if (this.selfieSegmentation) {
      this.selfieSegmentation.setOptions({
        modelSelection: 1,
        selfieMode: this.config.selfieMode
      });
    }
  }
  
  /**
   * Event system
   */
  on(event: string, callback: (data: any) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }
  
  off(event: string, callback: (data: any) => void): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }
  
  private emit(event: string, data: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }
  
  /**
   * Cleanup resources
   */
  cleanup(): void {
    // Close MediaPipe solutions
    if (this.pose) {
      this.pose.close();
    }
    
    if (this.faceMesh) {
      this.faceMesh.close();
    }
    
    if (this.hands) {
      this.hands.close();
    }
    
    if (this.selfieSegmentation) {
      this.selfieSegmentation.close();
    }
    
    // Clear canvas
    if (this.canvas) {
      this.canvas.remove();
    }
    
    // Clear event listeners
    this.eventListeners.clear();
    
    // Reset state
    this.isInitialized = false;
    this.isProcessing = false;
    this.lastResults = null;
    this.resultsHistory = [];
    
    console.log('MediaPipe Integration cleaned up');
  }
}
