const { formatUsd } = require('./money');

function buildExplanation({ seats, tier, maxDiscountPct, subtotal, discountPct, discountAmount, total, annualCommitment, approvalRequired, approvalReasons }) {
  const commitmentText = annualCommitment ? ' Annual commitment is selected; it does not change price.' : '';
  const approvalText = approvalRequired
    ? ` Approval required because ${approvalReasons.map(humanizeReason).join(' and ')}.`
    : ' Approval is not required under the current rules.';

  return `${seats} seat${seats === 1 ? '' : 's'} → ${tier} tier → maximum discount ${maxDiscountPct}%. ` +
    `Subtotal ${formatUsd(subtotal)} → ${discountPct}% discount (${formatUsd(discountAmount)}) → final ${formatUsd(total)}.${commitmentText}${approvalText}`;
}

function humanizeReason(reason) {
  const mapping = {
    discount_above_15_percent: `discount is above 15%`,
    total_above_25000: `total is above $25,000`,
    annual_commitment_with_discount_above_10_percent: `annual commitment is selected and discount is above 10%`
  };
  return mapping[reason] || reason;
}

module.exports = { buildExplanation };
