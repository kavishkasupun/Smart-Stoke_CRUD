import { Badge } from './Badge';

/**
 * Predefined status configurations for inventory management.
 */
const STATUS_CONFIG = {
  // General
  active:       { label: 'Active',       variant: 'success', dot: true },
  inactive:     { label: 'Inactive',     variant: 'default', dot: true },

  // Stock
  'in-stock':   { label: 'In Stock',     variant: 'success', dot: true },
  'low-stock':  { label: 'Low Stock',    variant: 'warning', dot: true },
  'out-of-stock': { label: 'Out of Stock', variant: 'danger', dot: true },

  // Bills
  draft:        { label: 'Draft',        variant: 'default', dot: true },
  confirmed:    { label: 'Confirmed',    variant: 'success', dot: true },
  cancelled:    { label: 'Cancelled',    variant: 'danger',  dot: true },
  returned:     { label: 'Returned',     variant: 'warning', dot: true },

  // Transfers
  pending:      { label: 'Pending',      variant: 'warning', dot: true },
  completed:    { label: 'Completed',    variant: 'success', dot: true },
  rejected:     { label: 'Rejected',     variant: 'danger',  dot: true },
};

/**
 * StatusBadge — renders a predefined status badge.
 *
 * @param {object} props
 * @param {string} props.status - Key from STATUS_CONFIG
 * @param {'sm'|'md'|'lg'} [props.size='md']
 * @param {string} [props.className]
 */
export function StatusBadge({ status, size = 'md', className }) {
  const config = STATUS_CONFIG[status];

  if (!config) {
    return (
      <Badge variant="default" size={size} className={className}>
        {status}
      </Badge>
    );
  }

  return (
    <Badge variant={config.variant} size={size} dot={config.dot} className={className}>
      {config.label}
    </Badge>
  );
}
