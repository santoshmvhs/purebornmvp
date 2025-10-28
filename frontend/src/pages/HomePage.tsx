import React from 'react';
import ParticleSystem from '../components/ParticleSystem';
import './HomePage.css';

const HomePage: React.FC = () => {
  return (
    <div className="homepage">
      {/* Ultra Premium Hero Section */}
      <section className="hero-premium">
        <ParticleSystem
          particleCount={25}
          particleTypes={['oil-drop', 'leaf', 'sparkle']}
          intensity="medium"
          className="hero-particles"
        />
        <div className="hero-background">
          <div className="hero-overlay"></div>
          <div className="floating-elements">
            <div className="floating-oil-drop oil-drop-1">💧</div>
            <div className="floating-oil-drop oil-drop-2">💧</div>
            <div className="floating-oil-drop oil-drop-3">💧</div>
            <div className="floating-leaf leaf-1">🍃</div>
            <div className="floating-leaf leaf-2">🍃</div>
          </div>
        </div>
        
        <div className="hero-content-premium">
          <div className="hero-text">
            <div className="brand-badge">
              <span className="badge-text">EST. 2024</span>
              <span className="badge-line"></span>
            </div>
            
            <h1 className="hero-title-premium">
              <span className="title-line-1">Pureborn</span>
              <span className="title-line-2">Cold Pressed</span>
              <span className="title-line-3">Excellence</span>
            </h1>
            
            <p className="hero-description-premium">
              Experience the pinnacle of purity. Our artisanal cold pressed oils are crafted 
              with centuries-old techniques, delivering unmatched quality and wellness benefits 
              for the discerning connoisseur.
            </p>
            
            <div className="hero-stats">
              <div className="stat">
                <span className="stat-number">100%</span>
                <span className="stat-label">Pure</span>
              </div>
              <div className="stat">
                <span className="stat-number">0°C</span>
                <span className="stat-label">Cold Pressed</span>
              </div>
              <div className="stat">
                <span className="stat-number">24hr</span>
                <span className="stat-label">Fresh</span>
              </div>
            </div>
            
            <div className="hero-actions-premium">
              <button className="btn-premium-primary">
                <span className="btn-text">Discover Collection</span>
                <span className="btn-icon">→</span>
              </button>
              <button className="btn-premium-secondary">
                <span className="btn-text">Watch Our Story</span>
                <span className="btn-play">▶</span>
              </button>
            </div>
          </div>
          
          <div className="hero-visual">
            <div className="premium-bottles">
              <div className="bottle-premium bottle-1">
                <div className="bottle-glow"></div>
                <div className="bottle-content">🥥</div>
                <div className="bottle-label">Virgin Coconut</div>
              </div>
              <div className="bottle-premium bottle-2">
                <div className="bottle-glow"></div>
                <div className="bottle-content">🫒</div>
                <div className="bottle-label">Sesame Gold</div>
              </div>
              <div className="bottle-premium bottle-3">
                <div className="bottle-glow"></div>
                <div className="bottle-content">🌻</div>
                <div className="bottle-label">Sunflower Pure</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Premium Features Section */}
      <section className="features-premium">
        <ParticleSystem
          particleCount={15}
          particleTypes={['leaf', 'sparkle']}
          intensity="low"
          className="background-particles"
        />
        <div className="container-premium">
          <div className="section-header-premium">
            <span className="section-badge">Why Choose Pureborn</span>
            <h2 className="section-title-premium">The Art of Pure Excellence</h2>
            <p className="section-subtitle-premium">
              Every drop tells a story of tradition, quality, and uncompromising standards
            </p>
          </div>
          
          <div className="features-grid-premium">
            <div className="feature-card-premium">
              <div className="feature-icon-premium">
                <div className="icon-background">🌿</div>
              </div>
              <h3 className="feature-title-premium">Artisanal Craftsmanship</h3>
              <p className="feature-description-premium">
                Hand-selected ingredients processed using traditional cold pressing methods 
                that preserve every nutrient and flavor note.
              </p>
              <div className="feature-highlight">100% Natural</div>
            </div>
            
            <div className="feature-card-premium">
              <div className="feature-icon-premium">
                <div className="icon-background">🏆</div>
              </div>
              <h3 className="feature-title-premium">Award-Winning Quality</h3>
              <p className="feature-description-premium">
                Recognized by international food authorities for purity, potency, and 
                exceptional taste profiles that exceed industry standards.
              </p>
              <div className="feature-highlight">Certified Premium</div>
            </div>
            
            <div className="feature-card-premium">
              <div className="feature-icon-premium">
                <div className="icon-background">🔬</div>
              </div>
              <h3 className="feature-title-premium">Scientific Precision</h3>
              <p className="feature-description-premium">
                Each batch undergoes rigorous testing in our state-of-the-art laboratory 
                ensuring consistent quality and safety standards.
              </p>
              <div className="feature-highlight">Lab Tested</div>
            </div>
            
            <div className="feature-card-premium">
              <div className="feature-icon-premium">
                <div className="icon-background">🌍</div>
              </div>
              <h3 className="feature-title-premium">Sustainable Excellence</h3>
              <p className="feature-description-premium">
                Committed to environmental responsibility through sustainable sourcing 
                and eco-friendly packaging that protects our planet.
              </p>
              <div className="feature-highlight">Eco-Conscious</div>
            </div>
          </div>
        </div>
      </section>

      {/* Premium Product Showcase */}
      <section className="showcase-premium">
        <div className="container-premium">
          <div className="section-header-premium">
            <span className="section-badge">Our Collection</span>
            <h2 className="section-title-premium">Curated Excellence</h2>
            <p className="section-subtitle-premium">
              Discover our signature collection of premium cold pressed oils
            </p>
          </div>
          
          <div className="showcase-grid-premium">
            <div className="showcase-item-premium">
              <div className="showcase-image">
                <div className="image-overlay"></div>
                <div className="product-icon">🥥</div>
                <div className="premium-badge">Signature</div>
              </div>
              <div className="showcase-content">
                <h3 className="showcase-title">Virgin Coconut Oil</h3>
                <p className="showcase-description">
                  Extracted from the finest coconuts, this oil delivers pure tropical essence 
                  with exceptional health benefits.
                </p>
                <div className="showcase-price">From ₹299</div>
                <button className="btn-premium-outline">Explore Collection</button>
              </div>
            </div>
            
            <div className="showcase-item-premium">
              <div className="showcase-image">
                <div className="image-overlay"></div>
                <div className="product-icon">🫒</div>
                <div className="premium-badge">Heritage</div>
              </div>
              <div className="showcase-content">
                <h3 className="showcase-title">Sesame Gold Oil</h3>
                <p className="showcase-description">
                  A timeless classic with rich, nutty flavors and traditional Ayurvedic 
                  properties passed down through generations.
                </p>
                <div className="showcase-price">From ₹249</div>
                <button className="btn-premium-outline">Explore Collection</button>
              </div>
            </div>
            
            <div className="showcase-item-premium">
              <div className="showcase-image">
                <div className="image-overlay"></div>
                <div className="product-icon">🌻</div>
                <div className="premium-badge">Pure</div>
              </div>
              <div className="showcase-content">
                <h3 className="showcase-title">Sunflower Pure Oil</h3>
                <p className="showcase-description">
                  Light, versatile, and perfect for everyday culinary adventures while 
                  maintaining the highest nutritional standards.
                </p>
                <div className="showcase-price">From ₹199</div>
                <button className="btn-premium-outline">Explore Collection</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Premium Manufacturing Process */}
      <section className="process-premium">
        <div className="container-premium">
          <div className="section-header-premium">
            <span className="section-badge">Our Process</span>
            <h2 className="section-title-premium">The Pureborn Method</h2>
            <p className="section-subtitle-premium">
              A meticulous journey from seed to bottle, ensuring every drop meets our exacting standards
            </p>
          </div>
          
          <div className="process-timeline-premium">
            <div className="process-step-premium">
              <div className="step-number-premium">01</div>
              <div className="step-content-premium">
                <h3 className="step-title-premium">Seed Selection</h3>
                <p className="step-description-premium">
                  Hand-picked from the finest farms, ensuring only the highest quality seeds 
                  make it to our production facility.
                </p>
              </div>
            </div>
            
            <div className="process-step-premium">
              <div className="step-number-premium">02</div>
              <div className="step-content-premium">
                <h3 className="step-title-premium">Cold Extraction</h3>
                <p className="step-description-premium">
                  Traditional cold pressing at controlled temperatures preserves nutrients 
                  and maintains the oil's natural integrity.
                </p>
              </div>
            </div>
            
            <div className="process-step-premium">
              <div className="step-number-premium">03</div>
              <div className="step-content-premium">
                <h3 className="step-title-premium">Quality Testing</h3>
                <p className="step-description-premium">
                  Rigorous laboratory testing ensures purity, potency, and safety standards 
                  that exceed international requirements.
                </p>
              </div>
            </div>
            
            <div className="process-step-premium">
              <div className="step-number-premium">04</div>
              <div className="step-content-premium">
                <h3 className="step-title-premium">Premium Packaging</h3>
                <p className="step-description-premium">
                  Elegant, eco-friendly packaging that protects the oil's quality while 
                  reflecting our commitment to luxury and sustainability.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Premium CTA Section */}
      <section className="cta-premium">
        <ParticleSystem
          particleCount={20}
          particleTypes={['oil-drop', 'sparkle', 'bubble']}
          intensity="medium"
          className="overlay-particles"
        />
        <div className="cta-background">
          <div className="cta-overlay"></div>
        </div>
        <div className="container-premium">
          <div className="cta-content-premium">
            <h2 className="cta-title-premium">Begin Your Journey to Pure Excellence</h2>
            <p className="cta-description-premium">
              Join thousands of discerning customers who have made Pureborn their choice 
              for premium cold pressed oils. Experience the difference that quality makes.
            </p>
            <div className="cta-actions-premium">
              <button className="btn-premium-primary-large">
                <span className="btn-text">Explore Our Collection</span>
                <span className="btn-icon">→</span>
              </button>
              <button className="btn-premium-secondary-large">
                <span className="btn-text">Create Subscription</span>
                <span className="btn-icon">♻</span>
              </button>
            </div>
            
            <div className="cta-stats-premium">
              <div className="cta-stat">
                <span className="stat-number">10K+</span>
                <span className="stat-label">Happy Customers</span>
              </div>
              <div className="cta-stat">
                <span className="stat-number">50+</span>
                <span className="stat-label">Awards Won</span>
              </div>
              <div className="cta-stat">
                <span className="stat-number">99.9%</span>
                <span className="stat-label">Purity Guarantee</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
