import Nav from '../components/Nav'
import Hero from '../components/Hero'
import InvestmentOverview from '../components/InvestmentOverview'
import FeaturedOpportunities from '../components/FeaturedOpportunities'
import WhySpaceXInvest from '../components/WhySpaceXInvest'
import SecurityCompliance from '../components/SecurityCompliance'
import FAQ from '../components/FAQ'
import Footer from '../components/Footer'

export default function Page() {
  return (
    <main className="min-h-screen bg-background">
      <Nav />
      <Hero />
      <InvestmentOverview />
      <FeaturedOpportunities />
      <WhySpaceXInvest />
      <SecurityCompliance />
      <FAQ />
      <Footer />
    </main>
  )
}
