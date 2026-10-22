import { Component } from 'react';

// A decorative asset failure must not take the lead form offline.
export default class SceneBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return <div className="chrome-environment" data-render-state="fallback" aria-hidden="true" />;
    }
    return this.props.children;
  }
}
