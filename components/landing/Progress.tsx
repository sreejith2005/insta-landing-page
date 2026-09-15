const steps = ["Details", "Your Piece", "Private Appointment"];

export function Progress({ active }: { active: 0 | 1 | 2 }) {
  return (
    <nav aria-label="Your progress" className="progress">
      <ol>
        {steps.map((step, index) => (
          <li key={step} aria-current={index === active ? "step" : undefined}>
            <span className="progress-dot" aria-hidden="true" />
            <span>{step}</span>
          </li>
        ))}
      </ol>
    </nav>
  );
}
