import { CheckInForm } from '../components/CheckInForm';

export function ReceptionPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-[#2E211A] mb-6">Recepción - Operaciones</h1>
      
      {/* Aquí llamamos a tu componente */}
      <CheckInForm reservationId="reserva-mock-123" />
    </div>
  );
}