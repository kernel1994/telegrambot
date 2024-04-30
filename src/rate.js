class RealInterestRate {
    constructor(monthly, amount, period) {
      this.monthly = monthly;
      this.amount = amount;
      this.period = period;
      this.rate = this._calculateRate();
      this.realRateYearly = this.rate * 12;
      this.totalInterest = this.monthly * this.period - this.amount;
      this.averageRateMonthly = this.totalInterest / this.amount / this.period;
      this.averageRateYearly = this.averageRateMonthly * 12;
    }

    _rateFn(rate) {
      return (
        this.amount *
          ((rate * Math.pow(1 + rate, this.period)) /
            (Math.pow(1 + rate, this.period) - 1)) -
        this.monthly
      );
    }

    _rateDFn(rate) {
      return (
        (-6000000 * rate * Math.pow(1 + rate, 119)) /
          Math.pow(Math.pow(1 + rate, 60) - 1, 2) +
        (6000000 * rate * Math.pow(1 + rate, 59)) / (Math.pow(1 + rate, 60) - 1) +
        (100000 * Math.pow(1 + rate, 60)) / (Math.pow(1 + rate, 60) - 1)
      );
    }

    _calculateRate() {
      let x0 = 0.1;
      let x1 = x0;
      const epsilon = 1e-7;
      const maxIterations = 1000;
      let iteration = 0;

      while (true) {
        x1 = x0 - this._rateFn(x0) / this._rateDFn(x0);

        if (Math.abs(x1 - x0) < epsilon || iteration >= maxIterations) {
          break;
        }

        iteration++;
        x0 = x1;
      }

      return x1;
    }

    csv() {
      let accumulatedPaidPrincipal = 0;
      let accumulatedPaidInterest = 0;

      let csvOutput = '期数,月供,月供本金,月供利息,累计还本金,累计还利息,剩余本金,剩余利息\n';

      let currentAmount = this.amount;
      let currentTotalInterest = this.totalInterest;
      for (let i = 1; i <= this.period; i++) {
        const payInterest = currentAmount * this.rate;
        const payPrincipal = this.monthly - payInterest;

        const surplusPrincipal = currentAmount - payPrincipal;
        currentAmount = surplusPrincipal;
        const surplusInterest = currentTotalInterest - payInterest;
        currentTotalInterest = surplusInterest;

        accumulatedPaidPrincipal += payPrincipal;
        accumulatedPaidInterest += payInterest;

        csvOutput += `${i},${payPrincipal + payInterest},${payPrincipal},${payInterest},${accumulatedPaidPrincipal},${accumulatedPaidInterest},${surplusPrincipal},${surplusInterest}\n`;
      }

      return csvOutput;
    }
  }

  export { RealInterestRate };
