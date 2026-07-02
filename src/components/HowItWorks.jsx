import './HowItWorks.css';

const STEPS = [
  {
    number: '1',
    title: 'Enter Your Address',
    description:
      'Share your property address using the form above. It takes less than a minute and there is no cost.',
  },
  {
    number: '2',
    title: 'We Review the Property',
    description:
      'Our team looks over the information you provide and prepares a fair cash offer for your situation.',
  },
  {
    number: '3',
    title: 'Receive Your Cash Offer',
    description:
      'We reach out with clear cash terms. You choose the closing date that works best for you.',
  },
];

export default function HowItWorks() {
  return (
    <section className="section how-it-works" id="how-it-works">
      <div className="container">
        <span className="eyebrow">Simple Process</span>
        <h2 className="section-title">How It Works</h2>
        <p className="section-subtitle">
          Three straightforward steps from your address to a real cash offer.
        </p>

        <ol className="steps-grid">
          {STEPS.map((step) => (
            <li key={step.number} className="step-card">
              <span className="step-number" aria-hidden="true">
                {step.number}
              </span>
              <h3 className="step-title">{step.title}</h3>
              <p className="step-description">{step.description}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
