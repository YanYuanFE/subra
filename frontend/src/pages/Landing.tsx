import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowRight, Shield, Zap, Users, Check } from "lucide-react";

const Landing = () => {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
          <div className="animate-fade-in">
            <div className="w-20 h-20 bg-gradient-primary rounded-2xl mx-auto mb-8 flex items-center justify-center shadow-glow">
              <span className="text-4xl font-bold text-primary-foreground">S</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
              Subra
            </h1>
            
            <p className="text-2xl md:text-3xl text-muted-foreground mb-8 max-w-3xl mx-auto">
              Own your subscriptions, on <span className="text-primary font-semibold">Starknet</span>
            </p>
            
            <p className="text-lg text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed">
              Take control of your digital subscriptions with decentralized, transparent, and user-owned subscription management. No more forgotten payments or hidden fees.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link to="/dashboard">
                <Button size="lg" className="bg-gradient-primary hover:shadow-glow transition-all duration-300 text-lg px-8 py-6">
                  Get Started
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <Link to="/creator">
                <Button variant="outline" size="lg" className="text-lg px-8 py-6 hover:bg-muted">
                  For Creators
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Why Choose Subra?</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Built on Starknet for transparency, control, and true ownership
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="p-8 text-center hover:shadow-lg transition-all duration-300 animate-slide-up">
              <div className="w-16 h-16 bg-gradient-primary rounded-xl mx-auto mb-4 flex items-center justify-center">
                <Shield className="w-8 h-8 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-3">True Ownership</h3>
              <p className="text-muted-foreground">
                Your subscriptions, your data, your control. Built on decentralized infrastructure you can trust.
              </p>
            </Card>
            
            <Card className="p-8 text-center hover:shadow-lg transition-all duration-300 animate-slide-up" style={{ animationDelay: '0.1s' }}>
              <div className="w-16 h-16 bg-gradient-accent rounded-xl mx-auto mb-4 flex items-center justify-center">
                <Zap className="w-8 h-8 text-accent-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Smart Automation</h3>
              <p className="text-muted-foreground">
                Automated renewals, instant notifications, and seamless payment processing on Starknet.
              </p>
            </Card>
            
            <Card className="p-8 text-center hover:shadow-lg transition-all duration-300 animate-slide-up" style={{ animationDelay: '0.2s' }}>
              <div className="w-16 h-16 bg-success rounded-xl mx-auto mb-4 flex items-center justify-center">
                <Users className="w-8 h-8 text-success-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Creator Friendly</h3>
              <p className="text-muted-foreground">
                Easy plan creation, instant payouts, and direct relationships with your subscribers.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
          <Card className="p-12 bg-gradient-subtle border-primary/20">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to take control?</h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              Join the future of subscription management. Transparent, decentralized, and built for you.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/dashboard">
                <Button size="lg" className="bg-gradient-primary hover:shadow-glow transition-all duration-300">
                  Start Managing Subscriptions
                </Button>
              </Link>
              <Link to="/creator">
                <Button variant="outline" size="lg" className="hover:bg-muted">
                  Create Your First Plan
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
};

export default Landing;