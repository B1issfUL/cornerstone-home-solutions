import { Component } from 'react';
import { reportError } from '../lib/diagnostics.js';

// A decorative asset failure must not take the lead form offline.
export default class SceneBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    reportError(this.props.scope || 'scene.load', error);
  }

  render() {
    if (this.state.failed) {
      return this.props.fallback ?? (
        <div className="chrome-environment" data-render-state="fallback" aria-hidden="true" />
      );
    }
    return this.props.children;
  }
}
