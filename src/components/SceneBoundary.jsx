import { Component } from 'react';
import { reportError } from '../lib/diagnostics.js';

// A decorative asset failure must not take the lead form offline.
export default class SceneBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    reportError('scene.load', error);
  }

  render() {
    if (this.state.failed) {
      return <div className="chrome-environment" data-render-state="fallback" aria-hidden="true" />;
    }
    return this.props.children;
  }
}
