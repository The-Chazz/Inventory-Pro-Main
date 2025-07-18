import Header from "@/components/Header";
import DashboardStats from "@/components/DashboardStats";
import RecentSales from "@/components/RecentSales";
import LowStockAlerts from "@/components/LowStockAlerts";
import { useAppContext } from "@/context/AppContext";

const Dashboard: React.FC = () => {
  const { currentPage } = useAppContext();
  
  return (
    <>
      <Header title={currentPage} />
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="space-y-6">
          <DashboardStats />
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <RecentSales />
            <LowStockAlerts />
          </div>
        </div>
      </main>
    </>
  );
};

export default Dashboard;
