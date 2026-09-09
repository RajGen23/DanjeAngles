import { Itinerary } from '@/types';

export const Ribbon = ({ itin }: { itin: Itinerary }) => {
  const stopPill = itin.connection ? (
    <span className={`rb-stop ${itin.self_transfer ? '' : 'same'}`}>
      <i className="di"></i>
      {Math.floor(itin.connection.minutes / 60)}h {String(itin.connection.minutes % 60).padStart(2, '0')} · {itin.connection.airport}
    </span>
  ) : null;

  return (
    <>
      <div className="ribbon">
        <span className="rb-node"></span>
        <span className="rb-seg" data-c="a" style={{ flex: itin.legs[0].duration_min }}></span>
        {itin.legs.length > 1 && (
          <>
            {stopPill}
            <span className="rb-seg" data-c={itin.self_transfer ? 'b' : 'a'} style={{ flex: itin.legs[1].duration_min }}></span>
          </>
        )}
        <span className={`rb-node ${itin.self_transfer ? 'end' : ''}`}></span>
      </div>
      <div className="ribbon-labels">
        <span style={{ flex: itin.legs[0].duration_min }}>{itin.legs[0].airline_name} {itin.legs[0].flight_no}</span>
        {itin.legs.length > 1 && (
          <>
            <span className={`rb-stop ${itin.self_transfer ? '' : 'same'}`} aria-hidden="true" style={{ visibility: 'hidden' }}>
              <i className="di"></i>{Math.floor((itin.connection?.minutes || 0) / 60)}h · {itin.connection?.airport}
            </span>
            <span style={{ flex: itin.legs[1].duration_min }}>{itin.legs[1].airline_name} {itin.legs[1].flight_no}</span>
          </>
        )}
      </div>
    </>
  );
};
