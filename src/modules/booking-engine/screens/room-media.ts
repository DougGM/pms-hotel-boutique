import type { RoomType } from '@/shared/types/entities/room-type';

type RoomGalleryImage = {
  src: string;
  alt: string;
};

const ROOM_TYPE_GALLERIES: Record<string, RoomGalleryImage[]> = {
  'RT-01': [
    {
      src: 'https://images.pexels.com/photos/271624/pexels-photo-271624.jpeg?auto=compress&cs=tinysrgb&w=1200',
      alt: 'Habitacion estandar con cama matrimonial',
    },
    {
      src: 'https://images.pexels.com/photos/164595/pexels-photo-164595.jpeg?auto=compress&cs=tinysrgb&w=1200',
      alt: 'Bano luminoso de habitacion estandar',
    },
    {
      src: 'https://images.pexels.com/photos/261102/pexels-photo-261102.jpeg?auto=compress&cs=tinysrgb&w=1200',
      alt: 'Area de descanso de habitacion estandar',
    },
  ],
  'RT-02': [
    {
      src: 'https://images.pexels.com/photos/164595/pexels-photo-164595.jpeg?auto=compress&cs=tinysrgb&w=1200',
      alt: 'Habitacion deluxe con cama king',
    },
    {
      src: 'https://images.pexels.com/photos/271624/pexels-photo-271624.jpeg?auto=compress&cs=tinysrgb&w=1200',
      alt: 'Detalle de cama en habitacion deluxe',
    },
    {
      src: 'https://images.pexels.com/photos/261102/pexels-photo-261102.jpeg?auto=compress&cs=tinysrgb&w=1200',
      alt: 'Vista interior de habitacion deluxe',
    },
  ],
  'RT-03': [
    {
      src: 'https://images.pexels.com/photos/261102/pexels-photo-261102.jpeg?auto=compress&cs=tinysrgb&w=1200',
      alt: 'Junior suite con area de estar',
    },
    {
      src: 'https://images.pexels.com/photos/271624/pexels-photo-271624.jpeg?auto=compress&cs=tinysrgb&w=1200',
      alt: 'Dormitorio de junior suite',
    },
    {
      src: 'https://images.pexels.com/photos/164595/pexels-photo-164595.jpeg?auto=compress&cs=tinysrgb&w=1200',
      alt: 'Detalle de bano en junior suite',
    },
  ],
};

export const ROOM_TYPE_COVER_IMAGES = Object.values(ROOM_TYPE_GALLERIES)
  .map((gallery) => gallery[0]?.src)
  .filter((src): src is string => Boolean(src));

export function getRoomTypeGallery(roomType: RoomType): RoomGalleryImage[] {
  return ROOM_TYPE_GALLERIES[roomType.id] ?? [];
}
