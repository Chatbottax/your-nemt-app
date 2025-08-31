import { useState } from 'react';

export default function MoneyInput({ valueCents, onChange }) {
  const [dollars, setDollars] = useState(valueCents ? (valueCents / 100).toFixed(2) : '');

  return (
    <input
      type="number"
      step="0.01"
      value={dollars}
      onChange={e => {
        setDollars(e.target.value);
        const cents = Math.round(parseFloat(e.target.value || '0') * 100);
        onChange(cents);
      }}
      className="p-2 bg-panel text-text"
    />
  );
}
