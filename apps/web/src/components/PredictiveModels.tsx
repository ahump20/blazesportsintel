import React from 'react';
import type { PredictiveModel } from '../types';

type PredictiveModelsProps = {
  models: PredictiveModel[];
  accent: string;
};

export function PredictiveModels({ models, accent }: PredictiveModelsProps) {
  if (!models.length) {
    return null;
  }

  return (
    <section className="panel predictive-models">
      <header className="panel__header">
        <h3>Predictive edge</h3>
        <span className="panel__meta">Model outputs vs market</span>
      </header>
      <ul className="predictive-models__list">
        {models.map((model) => (
          <li key={model.id} className="predictive-models__item">
            <div>
              <strong className="predictive-models__name">{model.name}</strong>
              <p className="predictive-models__projection">{model.projection}</p>
              <p className="predictive-models__insight">{model.insight}</p>
            </div>
            <div className="predictive-models__meta">
              <span className="predictive-models__edge">Edge {model.edge}</span>
              <div className="predictive-models__confidence" aria-label={`Confidence ${model.confidence}%`}>
                <span className="predictive-models__confidence-bar" style={{ width: `${Math.min(model.confidence, 100)}%`, background: accent }} />
              </div>
              <span className="predictive-models__confidence-value">{model.confidence}% confidence</span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
