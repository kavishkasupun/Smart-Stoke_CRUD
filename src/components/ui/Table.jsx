import { cn } from '../../utils/cn';
import { ArrowUpDown, ArrowUp, ArrowDown, Inbox } from 'lucide-react';

/**
 * Reusable responsive Table component.
 * Scrolls horizontally on small screens.
 *
 * @param {object} props
 * @param {Array<{key: string, label: string, sortable?: boolean, align?: 'left'|'center'|'right', className?: string}>} props.columns
 * @param {Array<object>} props.data
 * @param {function} [props.renderRow] - (row, index) => <tr>...</tr>
 * @param {string} [props.sortKey] - Currently sorted column key
 * @param {'asc'|'desc'} [props.sortDirection]
 * @param {function} [props.onSort] - (key) => void
 * @param {boolean} [props.loading=false]
 * @param {number} [props.skeletonRows=5]
 * @param {string} [props.emptyMessage='No data found']
 * @param {import('react').ReactNode} [props.emptyIcon]
 * @param {boolean} [props.stickyHeader=true]
 * @param {string} [props.className]
 */
export function Table({
  columns,
  data = [],
  renderRow,
  sortKey,
  sortDirection,
  onSort,
  loading = false,
  skeletonRows = 5,
  emptyMessage = 'No data found',
  emptyIcon,
  stickyHeader = true,
  className,
}) {
  const alignClass = (align) => {
    switch (align) {
      case 'center': return 'text-center';
      case 'right':  return 'text-right';
      default:       return 'text-left';
    }
  };

  const renderSortIcon = (col) => {
    if (!col.sortable) return null;
    if (sortKey !== col.key) {
      return <ArrowUpDown className="w-3.5 h-3.5 text-surface-400" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="w-3.5 h-3.5 text-primary-600" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 text-primary-600" />
    );
  };

  return (
    <div className={cn('w-full overflow-x-auto scrollbar-thin rounded-lg border border-surface-200', className)}>
      <table className="w-full min-w-[640px] text-sm">
        {/* Header */}
        <thead>
          <tr className={cn(
            'bg-surface-50 border-b border-surface-200',
            stickyHeader && 'sticky top-0 z-10'
          )}>
            {columns.map((col, idx) => (
              <th
                key={col.key || col.accessor || idx}
                className={cn(
                  'px-4 py-3 font-semibold text-surface-600 whitespace-nowrap',
                  alignClass(col.align),
                  col.sortable && 'cursor-pointer select-none hover:text-surface-900 transition-colors',
                  col.className
                )}
                onClick={col.sortable && onSort ? () => onSort(col.key) : undefined}
              >
                <span className="inline-flex items-center gap-1.5">
                  {col.label || col.header}
                  {renderSortIcon(col)}
                </span>
              </th>
            ))}
          </tr>
        </thead>

        {/* Body */}
        <tbody className="divide-y divide-surface-100">
          {loading
            ? Array.from({ length: skeletonRows }).map((_, i) => (
                <tr key={`skeleton-${i}`}>
                  {columns.map((col, idx) => (
                    <td key={col.key || col.accessor || idx} className="px-4 py-3">
                      <div className="skeleton h-4 w-3/4 rounded" />
                    </td>
                  ))}
                </tr>
              ))
            : data.length === 0
              ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-4 py-12 text-center"
                  >
                    <div className="flex flex-col items-center gap-2 text-surface-400">
                      {emptyIcon || <Inbox className="w-10 h-10" />}
                      <p className="text-sm">{emptyMessage}</p>
                    </div>
                  </td>
                </tr>
              )
              : data.map((row, index) =>
                  renderRow ? (
                    renderRow(row, index)
                  ) : (
                    <tr
                      key={row.id || index}
                      className="hover:bg-surface-50/50 transition-colors"
                    >
                      {columns.map((col, idx) => {
                        const cellValue = row[col.key || col.accessor];
                        return (
                          <td
                            key={col.key || col.accessor || idx}
                            className={cn(
                              'px-4 py-3 text-surface-700 whitespace-nowrap',
                              alignClass(col.align),
                              col.className
                            )}
                          >
                            {col.render ? col.render(cellValue, row) : (cellValue ?? '—')}
                          </td>
                        );
                      })}
                    </tr>
                  )
                )
          }
        </tbody>
      </table>
    </div>
  );
}
