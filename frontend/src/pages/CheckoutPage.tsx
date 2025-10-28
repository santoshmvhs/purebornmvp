import React, { useState } from 'react';
import api from '../lib/api';
import './CheckoutPage.css';

interface CheckoutPageProps {
	onOrderPlaced?: () => void;
}

const CheckoutPage: React.FC<CheckoutPageProps> = ({ onOrderPlaced }) => {
	const [step, setStep] = useState<'details' | 'shipping' | 'payment' | 'review'>('details');
	const [isProcessingPayment, setIsProcessingPayment] = useState(false);
	const [paymentError, setPaymentError] = useState('');
	const [form, setForm] = useState({
		firstName: '',
		lastName: '',
		email: '',
		phone: '',
		address1: '',
		address2: '',
		city: '',
		state: '',
		pincode: '',
		notes: '',
		shippingMethod: 'standard',
		paymentMethod: 'razorpay'
	});

	const update = (key: keyof typeof form, value: string) => {
		setForm(prev => ({ ...prev, [key]: value }));
	};

	const next = () => {
		if (step === 'details') setStep('shipping');
		else if (step === 'shipping') setStep('payment');
		else if (step === 'payment') setStep('review');
	};

	const back = () => {
		if (step === 'review') setStep('payment');
		else if (step === 'payment') setStep('shipping');
		else if (step === 'shipping') setStep('details');
	};

	const formatPrice = (price: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(price);

	const orderSubtotal = 847.0; // placeholder
	const shipping = form.shippingMethod === 'express' ? 149 : 0;
	const total = orderSubtotal + shipping;

	return (
		<div className="checkout-page">
			<div className="container-premium">
				<div className="checkout-header">
					<h1>Checkout</h1>
					<p>Complete your purchase with our premium, secure checkout</p>
				</div>

				<div className="checkout-layout">
					{/* Left: Steps */}
					<div className="checkout-steps">
						<div className="steps-indicator">
							<div className={`step ${step === 'details' ? 'active' : ''}`}>1. Details</div>
							<div className={`step ${step === 'shipping' ? 'active' : ''}`}>2. Shipping</div>
							<div className={`step ${step === 'payment' ? 'active' : ''}`}>3. Payment</div>
							<div className={`step ${step === 'review' ? 'active' : ''}`}>4. Review</div>
						</div>

						{step === 'details' && (
							<div className="card">
								<h2>Contact & Billing</h2>
								<div className="grid-2">
									<div className="field">
										<label>First Name</label>
										<input value={form.firstName} onChange={e => update('firstName', e.target.value)} placeholder="John" />
									</div>
									<div className="field">
										<label>Last Name</label>
										<input value={form.lastName} onChange={e => update('lastName', e.target.value)} placeholder="Doe" />
									</div>
								</div>
								<div className="grid-2">
									<div className="field">
										<label>Email</label>
										<input type="email" value={form.email} onChange={e => update('email', e.target.value)} placeholder="john@pureborn.com" />
									</div>
									<div className="field">
										<label>Phone</label>
										<input value={form.phone} onChange={e => update('phone', e.target.value)} placeholder="+91 98765 43210" />
									</div>
								</div>
								<div className="field">
									<label>Address Line 1</label>
									<input value={form.address1} onChange={e => update('address1', e.target.value)} placeholder="Flat / House No, Street" />
								</div>
								<div className="field">
									<label>Address Line 2</label>
									<input value={form.address2} onChange={e => update('address2', e.target.value)} placeholder="Area, Landmark (optional)" />
								</div>
								<div className="grid-3">
									<div className="field"><label>City</label><input value={form.city} onChange={e => update('city', e.target.value)} /></div>
									<div className="field"><label>State</label><input value={form.state} onChange={e => update('state', e.target.value)} /></div>
									<div className="field"><label>Pincode</label><input value={form.pincode} onChange={e => update('pincode', e.target.value)} /></div>
								</div>
								<div className="field"><label>Order Notes</label><textarea value={form.notes} onChange={e => update('notes', e.target.value)} placeholder="Any special instructions?" /></div>

								<div className="actions">
									<button className="btn-secondary" onClick={next}>Continue to Shipping →</button>
								</div>
							</div>
						)}

						{step === 'shipping' && (
							<div className="card">
								<h2>Shipping Method</h2>
								<div className="option" onClick={() => update('shippingMethod', 'standard')}>
									<div>
										<div className="option-title">Standard (2-5 days)</div>
										<div className="option-sub">Free for orders over ₹1000</div>
									</div>
									<div className="option-price">Free</div>
								</div>
								<div className={`option ${form.shippingMethod === 'express' ? 'selected' : ''}`} onClick={() => update('shippingMethod', 'express')}>
									<div>
										<div className="option-title">Express (1-2 days)</div>
										<div className="option-sub">Fast delivery with priority handling</div>
									</div>
									<div className="option-price">{formatPrice(149)}</div>
								</div>

								<div className="actions dual">
									<button className="btn-ghost" onClick={back}>← Back</button>
									<button className="btn-secondary" onClick={next}>Continue to Payment →</button>
								</div>
							</div>
						)}

						{step === 'payment' && (
							<div className="card">
								<h2>Payment</h2>
								<div className="payment-methods">
									<label className={`pay-option ${form.paymentMethod === 'razorpay' ? 'selected' : ''}`}>
										<input type="radio" name="pm" checked={form.paymentMethod === 'razorpay'} onChange={() => update('paymentMethod', 'razorpay')} />
										<span>Razorpay (UPI / Cards / NetBanking / Wallets)</span>
									</label>
									<label className={`pay-option ${form.paymentMethod === 'cod' ? 'selected' : ''}`}>
										<input type="radio" name="pm" checked={form.paymentMethod === 'cod'} onChange={() => update('paymentMethod', 'cod')} />
										<span>Cash on Delivery</span>
									</label>
								</div>

								<div className="actions dual">
									<button className="btn-ghost" onClick={back}>← Back</button>
									<button className="btn-secondary" onClick={next}>Review Order →</button>
								</div>
							</div>
						)}

						{step === 'review' && (
							<div className="card">
								<h2>Review & Pay</h2>
    <div className="review-block">
									<div className="review-row"><span>Subtotal</span><span>{formatPrice(orderSubtotal)}</span></div>
									<div className="review-row"><span>Shipping</span><span>{shipping === 0 ? 'Free' : formatPrice(shipping)}</span></div>
									<div className="review-row total"><span>Total</span><span>{formatPrice(total)}</span></div>
								</div>

        <button 
          className="btn-primary-lg" 
          disabled={isProcessingPayment}
          onClick={async () => {
            setIsProcessingPayment(true);
            setPaymentError('');
            
            try {
              const amount = total; // INR
              const { data } = await api.post('/payments/create-order', { 
                amount, 
                currency: 'INR', 
                notes: { 
                  email: form.email, 
                  phone: form.phone,
                  shipping_method: form.shippingMethod 
                } 
              });
              
              if (!data.success) {
                setPaymentError('Failed to create payment order');
                return;
              }

              const options: any = {
                key: data.keyId,
                amount: data.amount,
                currency: data.currency,
                name: 'Pureborn',
                description: 'Premium Cold Pressed Oil Order',
                order_id: data.orderId,
                prefill: { 
                  name: `${form.firstName} ${form.lastName}`.trim(), 
                  email: form.email, 
                  contact: form.phone 
                },
                notes: { 
                  shipping_method: form.shippingMethod,
                  order_total: total.toString()
                },
                theme: { color: '#059669' },
                handler: function (response: any) {
                  console.log('Payment successful:', response);
                  
                  // Verify payment with backend
                  api.post('/payments/verify', {
                    razorpay_order_id: response.razorpay_order_id,
                    razorpay_payment_id: response.razorpay_payment_id,
                    razorpay_signature: response.razorpay_signature
                  }).then(({ data }) => {
                    if (data.success) {
                      onOrderPlaced?.();
                      alert('Payment successful! Your order has been placed.');
                    } else {
                      alert('Payment verification failed. Please contact support.');
                    }
                  }).catch((error) => {
                    console.error('Payment verification error:', error);
                    alert('Payment verification failed. Please contact support.');
                  });
                },
                modal: {
                  ondismiss: function() {
                    setIsProcessingPayment(false);
                  }
                }
              };
              
              // @ts-ignore
              const rzp = new (window as any).Razorpay(options);
              rzp.open();
            } catch (error: any) {
              console.error('Payment error:', error);
              setPaymentError(error?.response?.data?.message || 'Payment initialization failed');
            } finally {
              setIsProcessingPayment(false);
            }
          }}
        >
          <span className="btn-icon">🛡️</span>
          <span>{isProcessingPayment ? 'Processing...' : 'Pay Securely with Razorpay'}</span>
        </button>
        
        {paymentError && (
          <div style={{ 
            marginTop: '1rem', 
            padding: '0.75rem', 
            background: '#fee2e2', 
            color: '#dc2626', 
            borderRadius: '0.5rem',
            fontSize: '0.9rem'
          }}>
            ❌ {paymentError}
          </div>
        )}
								<p className="secure-note">You will be redirected to Razorpay for secure payment</p>
							</div>
						)}
					</div>

					{/* Right: Summary */}
					<div className="checkout-summary">
						<div className="summary-card">
							<h3>Order Summary</h3>
							<div className="summary-row"><span>Virgin Coconut Oil (500ml)</span><span>× 2</span></div>
							<div className="summary-row"><span>Sesame Gold Oil (500ml)</span><span>× 1</span></div>
							<div className="divider"></div>
							<div className="summary-row"><span>Subtotal</span><span>{formatPrice(orderSubtotal)}</span></div>
							<div className="summary-row"><span>Shipping</span><span>{shipping === 0 ? 'Free' : formatPrice(shipping)}</span></div>
							<div className="summary-row total"><span>Total</span><span>{formatPrice(total)}</span></div>
							<div className="trust">
								<span>🔒 256-bit SSL</span>
								<span>🛡️ Buyer Protection</span>
								<span>🚚 Free Over ₹1000</span>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default CheckoutPage;
