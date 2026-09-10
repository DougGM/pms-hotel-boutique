export interface RoomTypeDto {
  id: string;
  code: string;
  name: string;
  description?: string;
  capacity: number;
  bed_configuration: string;
  /**
   * Características de la habitación (aire acondicionado, balcón, vista al
   * jardín...), no amenidades del hotel. Una amenidad (piscina, spa) es un
   * servicio compartido con horario propio y no pertenece a un tipo de
   * habitación — ver `room_feature/` y docs/CONTRATO-DATOS.md sección 3.2.
   */
  room_feature_ids: string[];
  active: boolean;
  created_at: string;
  updated_at: string;
}
