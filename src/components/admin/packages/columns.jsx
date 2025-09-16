import React from 'react';
import { Badge } from "@/components/ui/badge";

export const visaPackageColumns = [
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'price', header: 'Price', cell: ({ row }) => `$${row.original.price}` },
  { accessorKey: 'country', header: 'Country' },
  { accessorKey: 'popular', header: 'Popular', cell: ({ row }) => row.original.popular ? <Badge>Yes</Badge> : 'No' },
];

export const tutorPackageColumns = [
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'price_cad_monthly', header: 'Price (CAD)', cell: ({ row }) => `$${row.original.price_cad_monthly}/month` },
  { accessorKey: 'commission_rate', header: 'Commission', cell: ({ row }) => `${row.original.commission_rate}%` },
  { accessorKey: 'popular', header: 'Popular', cell: ({ row }) => row.original.popular ? <Badge>Yes</Badge> : 'No' },
];

export const agentPackageColumns = [
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'fee_usd_yearly', header: 'Fee (USD)', cell: ({ row }) => `$${row.original.fee_usd_yearly}/year` },
  { accessorKey: 'description', header: 'Description' },
];

export const studentTutorPackageColumns = [
    { accessorKey: 'name', header: 'Name' },
    { accessorKey: 'price_display', header: 'Price', cell: ({ row }) => `${row.original.price_display} ($${row.original.price_usd})` },
    { accessorKey: 'num_sessions', header: 'Sessions' },
];