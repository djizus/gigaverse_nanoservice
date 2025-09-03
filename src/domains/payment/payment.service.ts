import { PricingInfo, DynamicPricingContext } from "../../shared/types/payment";

export class PaymentService {
  private static readonly BASE_PRICE_PER_RUN = 0.01; // $0.01 per run
  private static readonly MAX_PAYMENT_AMOUNT = 20.00; // $20.00 maximum payment
  private static readonly MAX_RUNS = Math.floor(PaymentService.MAX_PAYMENT_AMOUNT / PaymentService.BASE_PRICE_PER_RUN); // 2000 runs max

  static validatePaymentAmount(runs: number): { valid: boolean; error?: string; maxRuns?: number } {
    if (runs <= 0) {
      return {
        valid: false,
        error: "Number of runs must be greater than 0",
        maxRuns: this.MAX_RUNS
      };
    }
    
    const totalPrice = runs * this.BASE_PRICE_PER_RUN;
    
    if (totalPrice > this.MAX_PAYMENT_AMOUNT) {
      return {
        valid: false,
        error: `Payment amount $${totalPrice.toFixed(2)} exceeds maximum allowed $${this.MAX_PAYMENT_AMOUNT.toFixed(2)}`,
        maxRuns: this.MAX_RUNS
      };
    }
    
    return { valid: true };
  }

  static calculatePricing(runs: number): PricingInfo {
    const totalPrice = runs * this.BASE_PRICE_PER_RUN;
    
    return {
      basePrice: this.BASE_PRICE_PER_RUN,
      totalPrice,
      currency: "USD",
      runs
    };
  }

  static formatPriceString(totalPrice: number): string {
    return `$${totalPrice.toFixed(2)}`;
  }

  static createPricingContext(body: any): DynamicPricingContext | { error: string; maxRuns: number } {
    const runs = body.runs || 1;
    
    // Validate payment amount first
    const validation = this.validatePaymentAmount(runs);
    if (!validation.valid) {
      return {
        error: validation.error!,
        maxRuns: validation.maxRuns!
      };
    }
    
    const pricing = this.calculatePricing(runs);
    
    return {
      parsedBody: body,
      runs,
      totalPrice: pricing.totalPrice,
      priceString: this.formatPriceString(pricing.totalPrice)
    };
  }

  static logPricing(endpoint: string, context: DynamicPricingContext): void {
    console.log(`💰 Dynamic pricing for ${endpoint}: ${context.runs} runs = ${context.priceString}`);
  }
}