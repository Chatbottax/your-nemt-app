import { useEffect, useRef } from 'react';

export default function AddressInput({ value, onSelect }) {
  const inputRef = useRef();

  useEffect(() => {
    if (!window.google) {
      const script = document.createElement('script');
      // Use Maps JavaScript API key for loading the script; Places library is included
      script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.MAPS_JS_BROWSER_KEY}&libraries=places`;
      document.head.appendChild(script);
      script.onload = initAutocomplete;
    } else {
      initAutocomplete();
    }

    function initAutocomplete() {
      const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current);
      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        if (!place.place_id) return;
        const loc = place.geometry.location;
        onSelect({
          formatted: place.formatted_address,
          place_id: place.place_id,
          lat: loc.lat(),
          lng: loc.lng()
        });
      });
    }
  }, []);

  return (
    <input ref={inputRef} defaultValue={value} className="w-full p-2 bg-panel text-text" placeholder="Address" />
  );
}
