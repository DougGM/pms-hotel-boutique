export type RoomImage = {
  src: string;
  alt: string;
  sourceUrl: string;
};

const pexelsImage = (photoId: string): string =>
  `https://images.pexels.com/photos/${photoId}/pexels-photo-${photoId}.jpeg?auto=compress&cs=tinysrgb&w=1400`;

export const roomImages: Record<string, RoomImage[]> = {
  'RT-01': [
    {
      src: pexelsImage('17495859'),
      alt: 'Habitacion estandar moderna con cama y luz natural',
      sourceUrl: 'https://www.pexels.com/photo/bed-in-hotel-room-17495859/',
    },
    {
      src: pexelsImage('26840829'),
      alt: 'Detalle de cama minimalista en habitacion de hotel',
      sourceUrl: 'https://www.pexels.com/photo/a-neatly-done-bed-in-a-hotel-room-26840829/',
    },
    {
      src: pexelsImage('14580368'),
      alt: 'Habitacion acogedora con decoracion neutra',
      sourceUrl: 'https://www.pexels.com/photo/bed-in-hotel-room-14580368/',
    },
  ],
  'RT-02': [
    {
      src: pexelsImage('14645130'),
      alt: 'Habitacion deluxe amplia con cama king y mobiliario elegante',
      sourceUrl: 'https://www.pexels.com/photo/a-hotel-room-bed-14645130/',
    },
    {
      src: pexelsImage('19988067'),
      alt: 'Habitacion de hotel con madera calida y cama vestida',
      sourceUrl: 'https://www.pexels.com/photo/bed-in-a-hotel-room-19988067/',
    },
    {
      src: pexelsImage('28011238'),
      alt: 'Habitacion moderna con escritorio y cama doble',
      sourceUrl: 'https://www.pexels.com/photo/a-hotel-room-with-a-bed-and-a-window-28011238/',
    },
  ],
  'RT-03': [
    {
      src: pexelsImage('12805883'),
      alt: 'Suite con dos camas y vista desde la ventana',
      sourceUrl: 'https://www.pexels.com/photo/beds-inside-a-hotel-room-12805883/',
    },
    {
      src: pexelsImage('31609726'),
      alt: 'Habitacion moderna con cama clara y vista urbana',
      sourceUrl:
        'https://www.pexels.com/photo/modern-hotel-room-with-cozy-bed-and-window-view-31609726/',
    },
    {
      src: pexelsImage('14883357'),
      alt: 'Habitacion luminosa con textiles calidos y decoracion elegante',
      sourceUrl: 'https://www.pexels.com/photo/bed-in-hotel-room-14883357/',
    },
  ],
  'RT-04': [
    {
      src: pexelsImage('12805883'),
      alt: 'Habitacion familiar con camas dobles y ambiente luminoso',
      sourceUrl: 'https://www.pexels.com/photo/beds-inside-a-hotel-room-12805883/',
    },
    {
      src: pexelsImage('5475920'),
      alt: 'Habitacion con balcon y entrada de luz natural',
      sourceUrl: 'https://www.pexels.com/photo/bed-in-hotel-room-5475920/',
    },
    {
      src: pexelsImage('17495859'),
      alt: 'Habitacion tranquila con cama y cortinas suaves',
      sourceUrl: 'https://www.pexels.com/photo/bed-in-hotel-room-17495859/',
    },
  ],
  'RT-05': [
    {
      src: pexelsImage('14746040'),
      alt: 'Suite premium con balcon y vista al mar',
      sourceUrl: 'https://www.pexels.com/photo/luxury-hotel-room-14746040/',
    },
    {
      src: pexelsImage('37836001'),
      alt: 'Suite urbana de lujo con vista al horizonte',
      sourceUrl:
        'https://www.pexels.com/photo/luxury-hotel-room-with-bangkok-skyline-view-37836001/',
    },
    {
      src: pexelsImage('14645130'),
      alt: 'Suite espaciosa con cama king y acabados elegantes',
      sourceUrl: 'https://www.pexels.com/photo/a-hotel-room-bed-14645130/',
    },
  ],
};
