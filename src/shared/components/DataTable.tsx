import type { ReactNode } from 'react';

export type DataTableColumn<Row extends object> = {
  header: string;
  id: string;
  cell: (row: Row) => ReactNode;
};

type DataTableProps<Row extends object> = {
  columns: DataTableColumn<Row>[];
  data: Row[];
  emptyMessage?: string;
  getRowId: (row: Row, index: number) => string | number;
};

export function DataTable<Row extends object>({
  columns,
  data,
  emptyMessage = 'No hay registros para mostrar.',
  getRowId,
}: DataTableProps<Row>) {
  if (data.length === 0) return <p className="muted">{emptyMessage}</p>;

  return (
    <div className="adm-table-wrap">
      <table className="adm-table">
        <thead>
          <tr>{columns.map((column) => <th key={column.id}>{column.header}</th>)}</tr>
        </thead>
        <tbody>
          {data.map((row, index) => (
            <tr key={getRowId(row, index)}>
              {columns.map((column) => <td key={column.id}>{column.cell(row)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
