function dollarsToCents(value) {
  return Math.round(Number(value) * 100);
}

function centsToDollars(cents) {
  return Number((cents / 100).toFixed(2));
}

function roundPercentAmount(cents, percent) {
  return Math.round((cents * percent) / 100);
}

function formatUsd(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

module.exports = { dollarsToCents, centsToDollars, roundPercentAmount, formatUsd };
