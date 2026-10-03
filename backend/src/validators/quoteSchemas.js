const { z } = require('zod');

const lineSchema = z.object({
  sku: z.string().trim().min(1, 'Product SKU is required'),
  quantity: z.number().int('Quantity must be a whole number').positive('Quantity must be greater than 0')
});

const quoteDraftSchema = z.object({
  customerName: z.string().trim().min(2, 'Customer name must be at least 2 characters').max(120, 'Customer name is too long'),
  seats: z.number().int('Seats must be a whole number').positive('Seat count must be greater than 0'),
  lines: z.array(lineSchema).min(1, 'At least one product line is required'),
  discountPct: z.number().finite('Discount must be a valid number').min(0, 'Discount cannot be negative').max(100, 'Discount cannot exceed 100'),
  annualCommitment: z.boolean().default(false)
});

const statusSchema = z.object({
  status: z.enum(['submitted', 'approved', 'rejected'])
});

module.exports = { quoteDraftSchema, statusSchema };
