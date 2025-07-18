import React, { useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';

// COLORS FOR CHARTS
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#8dd1e1'];

interface ChartData {
  name: string;
  value: number;
  [key: string]: any;
}

interface TimeSeriesData {
  date: string;
  value: number;
  [key: string]: any;
}

interface ChartProps {
  data: any[];
  title: string;
  description?: string;
}

// TIME PERIOD FILTER COMPONENT
export const TimeFilter: React.FC<{
  onChange: (period: string) => void;
  defaultValue?: string;
}> = ({ onChange, defaultValue = 'all' }) => {
  return (
    <div className="flex items-center space-x-2 mb-4">
      <span className="text-sm text-gray-500">Time Range:</span>
      <Select defaultValue={defaultValue} onValueChange={onChange}>
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="Select period" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="7days">Last 7 Days</SelectItem>
          <SelectItem value="1month">Last Month</SelectItem>
          <SelectItem value="3months">Last 3 Months</SelectItem>
          <SelectItem value="6months">Last 6 Months</SelectItem>
          <SelectItem value="1year">Last Year</SelectItem>
          <SelectItem value="all">All Time</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};

// SALES TREND CHART
export const SalesTrendChart: React.FC<ChartProps> = ({ data, title, description }) => {
  const [period, setPeriod] = useState('all');
  const [chartType, setChartType] = useState<'area' | 'line' | 'bar'>('area');
  
  // Filter data based on selected period
  const filteredData = React.useMemo(() => {
    if (period === 'all') return data;
    
    const now = new Date();
    let cutoffDate = new Date();
    
    switch (period) {
      case '7days':
        cutoffDate.setDate(now.getDate() - 7);
        break;
      case '1month':
        cutoffDate.setMonth(now.getMonth() - 1);
        break;
      case '3months':
        cutoffDate.setMonth(now.getMonth() - 3);
        break;
      case '6months':
        cutoffDate.setMonth(now.getMonth() - 6);
        break;
      case '1year':
        cutoffDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        return data;
    }
    
    return data.filter(item => new Date(item.date) >= cutoffDate);
  }, [data, period]);

  // Calculate date interval for X-axis to avoid overcrowding
  const getDateInterval = () => {
    if (filteredData.length <= 15) return 0; // Show all points for small datasets
    if (filteredData.length <= 30) return 1; // Show every other point
    if (filteredData.length <= 60) return 2; // Show every third point
    return Math.floor(filteredData.length / 20); // Aim for about 20 points total
  };

  // Format large currency values for y-axis
  const formatYAxis = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
    return `$${value}`;
  };

  // Render appropriate chart type
  const renderChart = () => {
    const commonProps = {
      data: filteredData,
      margin: { top: 10, right: 30, left: 10, bottom: 10 }
    };

    const commonComponents = (
      <>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          dataKey="date" 
          interval={getDateInterval()}
          tickFormatter={(value) => {
            const date = new Date(value);
            return format(date, 'MM/dd');
          }}
          tick={{ fontSize: 11 }}
        />
        <YAxis 
          tickFormatter={formatYAxis}
          tick={{ fontSize: 11 }}
        />
        <Tooltip 
          formatter={(value: number) => [`$${value.toFixed(2)}`, 'Sales']}
          labelFormatter={(label) => {
            const date = new Date(label);
            return format(date, 'PPP');
          }}
        />
        <Legend />
      </>
    );

    // Always return a chart component, even if it's an empty one
    if (chartType === 'area') {
      return (
        <AreaChart {...commonProps}>
          {commonComponents}
          <Area 
            type="monotone" 
            dataKey="amount" 
            name="Sales" 
            stroke="#8884d8" 
            fill="#8884d8" 
            fillOpacity={0.3} 
          />
          <Area 
            type="monotone" 
            dataKey="refundAmount" 
            name="Refunds" 
            stroke="#ff8042" 
            fill="#ff8042" 
            fillOpacity={0.3} 
          />
        </AreaChart>
      );
    } else if (chartType === 'line') {
      return (
        <LineChart {...commonProps}>
          {commonComponents}
          <Line 
            type="monotone" 
            dataKey="amount" 
            name="Sales" 
            stroke="#8884d8" 
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 6 }}
          />
          <Line 
            type="monotone" 
            dataKey="refundAmount" 
            name="Refunds" 
            stroke="#ff8042" 
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      );
    } else {
      return (
        <BarChart {...commonProps}>
          {commonComponents}
          <Bar dataKey="amount" name="Sales" fill="#8884d8" />
          <Bar dataKey="refundAmount" name="Refunds" fill="#ff8042" />
        </BarChart>
      );
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
        <div className="flex flex-wrap gap-4 justify-between items-center">
          <TimeFilter onChange={setPeriod} />
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-gray-500">Chart Type:</span>
            <div className="flex gap-1">
              <Button 
                variant={chartType === 'area' ? 'default' : 'outline'}
                size="sm" 
                onClick={() => setChartType('area')}
              >
                Area
              </Button>
              <Button 
                variant={chartType === 'line' ? 'default' : 'outline'}
                size="sm" 
                onClick={() => setChartType('line')}
              >
                Line
              </Button>
              <Button 
                variant={chartType === 'bar' ? 'default' : 'outline'}
                size="sm" 
                onClick={() => setChartType('bar')}
              >
                Bar
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            {renderChart()}
          </ResponsiveContainer>
        </div>
        {filteredData.length === 0 && (
          <div className="flex justify-center items-center h-40">
            <p className="text-gray-500">No data available for the selected period.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// INVENTORY LEVELS CHART
export const InventoryLevelsChart: React.FC<ChartProps> = ({ data, title, description }) => {
  const [sortBy, setSortBy] = useState('alphabetical');
  const [showItems, setShowItems] = useState(10); // Default to 10 items for better readability
  
  // Sort data based on selection
  const sortedData = React.useMemo(() => {
    if (sortBy === 'alphabetical') {
      return [...data].sort((a, b) => a.name.localeCompare(b.name));
    }
    if (sortBy === 'stock-high') {
      return [...data].sort((a, b) => b.stock - a.stock);
    }
    if (sortBy === 'stock-low') {
      return [...data].sort((a, b) => a.stock - b.stock);
    }
    return data;
  }, [data, sortBy]);

  // Format item names to be shorter if needed
  const formattedData = React.useMemo(() => {
    return sortedData.slice(0, showItems).map(item => ({
      ...item,
      // Limit name length for display to prevent text crowding
      displayName: item.name.length > 15 ? item.name.substring(0, 15) + "..." : item.name
    }));
  }, [sortedData, showItems]);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
        <div className="flex flex-wrap gap-4 items-center mb-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">Sort By:</span>
            <Select defaultValue="alphabetical" onValueChange={setSortBy}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="alphabetical">Name (A-Z)</SelectItem>
                <SelectItem value="stock-high">Stock (High to Low)</SelectItem>
                <SelectItem value="stock-low">Stock (Low to High)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">Show:</span>
            <Select defaultValue="10" onValueChange={(val) => setShowItems(parseInt(val))}>
              <SelectTrigger className="w-[100px]">
                <SelectValue placeholder="Show items" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5 Items</SelectItem>
                <SelectItem value="10">10 Items</SelectItem>
                <SelectItem value="15">15 Items</SelectItem>
                <SelectItem value="20">20 Items</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={formattedData}
              margin={{ top: 5, right: 30, left: 20, bottom: 90 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="displayName" 
                angle={-45} 
                textAnchor="end"
                height={90}
                interval={0}
                tick={{ fontSize: 12 }}
              />
              <YAxis />
              <Tooltip 
                formatter={(value, name) => [value, name]}
                labelFormatter={(label) => {
                  // Show the full original name in the tooltip
                  const item = formattedData.find(d => d.displayName === label);
                  return item ? item.name : label;
                }}
              />
              <Legend verticalAlign="top" height={36} />
              <Bar dataKey="stock" fill="#8884d8" name="Current Stock" />
              <Bar dataKey="threshold" fill="#FF8042" name="Threshold" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

// PRODUCT SALES DISTRIBUTION CHART
export const ProductSalesChart: React.FC<ChartProps> = ({ data, title, description }) => {
  const [chartView, setChartView] = useState<'pie' | 'bar'>('pie');
  
  // Process the data for more clarity - truncate long names for display
  const processedData = React.useMemo(() => {
    return data.map(item => ({
      ...item,
      // Truncate long names to prevent overlap in pie chart
      displayName: item.name.length > 12 ? item.name.substring(0, 10) + '...' : item.name,
      fullName: item.name // Keep the original name for tooltips
    }));
  }, [data]);

  // Render pie chart with improved labeling
  const renderPieChart = () => (
    <PieChart>
      <Pie
        data={processedData}
        cx="50%"
        cy="50%"
        labelLine={false}
        outerRadius={75}
        fill="#8884d8"
        dataKey="value"
        nameKey="displayName"
        label={({ percent }) => 
          percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : ''
        }
      >
        {processedData.map((entry, index) => (
          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
        ))}
      </Pie>
      <Tooltip 
        formatter={(value, name, props) => [`${value} units`, props.payload.fullName]}
      />
      {/* Legend removed per user request */}
    </PieChart>
  );

  // Alternative bar chart view for better readability
  const renderBarChart = () => (
    <BarChart
      data={processedData.sort((a, b) => b.value - a.value)} // Sort by value descending
      layout="vertical"
      margin={{ top: 5, right: 30, left: 70, bottom: 5 }}
    >
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis type="number" />
      <YAxis 
        type="category" 
        dataKey="displayName" 
        width={70}
        tick={{ fontSize: 12 }}
      />
      <Tooltip 
        formatter={(value) => [`${value} units`, 'Quantity']}
        labelFormatter={(label) => {
          const item = processedData.find(d => d.displayName === label);
          return item?.fullName || label;
        }}
      />
      <Legend />
      <Bar dataKey="value" fill="#8884d8" name="Quantity Sold" />
    </BarChart>
  );

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
        <div className="flex justify-end mb-2">
          <div className="flex space-x-2">
            <Button 
              variant={chartView === 'pie' ? 'default' : 'outline'}
              size="sm" 
              onClick={() => setChartView('pie')}
            >
              Pie Chart
            </Button>
            <Button 
              variant={chartView === 'bar' ? 'default' : 'outline'}
              size="sm" 
              onClick={() => setChartView('bar')}
            >
              Bar Chart
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            {chartView === 'pie' ? renderPieChart() : renderBarChart()}
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

// REFUND ANALYSIS CHART
export const RefundAnalysisChart: React.FC<ChartProps> = ({ data, title, description }) => {
  const [period, setPeriod] = useState('all');

  // Filter data based on selected period
  const filteredData = React.useMemo(() => {
    if (period === 'all') return data;
    
    const now = new Date();
    let cutoffDate = new Date();
    
    switch (period) {
      case '7days':
        cutoffDate.setDate(now.getDate() - 7);
        break;
      case '1month':
        cutoffDate.setMonth(now.getMonth() - 1);
        break;
      case '3months':
        cutoffDate.setMonth(now.getMonth() - 3);
        break;
      default:
        return data;
    }
    
    return data.filter(item => new Date(item.date) >= cutoffDate);
  }, [data, period]);

  // Calculate refund rate
  const refundRate = React.useMemo(() => {
    if (!filteredData.length) return 0;
    
    const refundCount = filteredData.filter(item => item.status === 'Refunded').length;
    return (refundCount / filteredData.length) * 100;
  }, [filteredData]);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
        <TimeFilter onChange={setPeriod} />
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center mb-4">
          <span className="text-4xl font-bold">{refundRate.toFixed(2)}%</span>
          <span className="text-gray-500">Refund Rate</span>
        </div>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={filteredData}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tickFormatter={(value) => {
                  const date = new Date(value);
                  return format(date, 'MM/dd');
                }}
              />
              <YAxis />
              <Tooltip
                labelFormatter={(label) => {
                  const date = new Date(label);
                  return format(date, 'PPP');
                }}
              />
              <Legend />
              <Line type="monotone" dataKey="refundAmount" stroke="#FF8042" name="Refund Amount" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

// LOSS TRACKING CHART
export const LossTrackingChart: React.FC<ChartProps> = ({ data, title, description }) => {
  const [viewType, setViewType] = useState('time');

  // Transform data for category view
  const categoryData = React.useMemo(() => {
    const categories: {[key: string]: number} = {};
    
    data.forEach(item => {
      const category = item.reason || 'Unknown';
      if (!categories[category]) {
        categories[category] = 0;
      }
      categories[category] += item.value || 0;
    });
    
    return Object.entries(categories).map(([name, value]) => ({ name, value }));
  }, [data]);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
        <div className="flex flex-wrap gap-2">
          <Button 
            variant={viewType === 'time' ? 'default' : 'outline'} 
            onClick={() => setViewType('time')}
            size="sm"
          >
            Time Series
          </Button>
          <Button 
            variant={viewType === 'category' ? 'default' : 'outline'} 
            onClick={() => setViewType('category')}
            size="sm"
          >
            By Category
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            {viewType === 'time' ? (
              <AreaChart
                data={data}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    return format(date, 'MM/dd');
                  }}
                />
                <YAxis />
                <Tooltip 
                  formatter={(value: number) => [`$${value.toFixed(2)}`, 'Loss Value']}
                  labelFormatter={(label) => {
                    const date = new Date(label);
                    return format(date, 'PPP');
                  }}
                />
                <Legend />
                <Area type="monotone" dataKey="value" stroke="#FF8042" fill="#FF8042" fillOpacity={0.3} />
              </AreaChart>
            ) : (
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  nameKey="name"
                  label={({ percent }) => 
                    percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : ''
                  }
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Loss Value']} />
                {/* Legend removed per user request */}
              </PieChart>
            )}
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

// CASHIER PERFORMANCE RADAR CHART
export const CashierPerformanceChart: React.FC<ChartProps> = ({ data, title, description }) => {
  const [viewType, setViewType] = useState<'radar' | 'bar'>('bar'); // Default to bar chart for better clarity
  
  // Process data to handle long names and add formatters
  const processedData = React.useMemo(() => {
    return data.map(item => ({
      ...item,
      // Truncate long cashier names
      displayName: item.cashier?.length > 12 ? item.cashier.substring(0, 10) + '...' : item.cashier,
      fullName: item.cashier, // Keep full name for tooltips
      // Format amount to currency for display
      formattedAmount: `$${Number(item.amount).toFixed(2)}`
    })).sort((a, b) => b.amount - a.amount); // Sort by amount descending
  }, [data]);

  // Render radar chart (only when there are 6 or fewer cashiers for readability)
  const renderRadarChart = () => (
    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={processedData.slice(0, 6)}>
      <PolarGrid />
      <PolarAngleAxis 
        dataKey="displayName" 
        tick={{ fontSize: 11 }}
      />
      <PolarRadiusAxis 
        angle={30} 
        domain={[0, 'auto']} 
        tickFormatter={(value) => value > 1000 ? `$${(value/1000).toFixed(1)}K` : `$${value}`}
      />
      <Radar 
        name="Sales Total" 
        dataKey="amount" 
        stroke="#8884d8" 
        fill="#8884d8" 
        fillOpacity={0.6} 
      />
      <Radar 
        name="Transactions" 
        dataKey="transactions" 
        stroke="#82ca9d" 
        fill="#82ca9d" 
        fillOpacity={0.6} 
      />
      <Legend />
      <Tooltip 
        formatter={(value, name, props) => {
          if (name === "Sales Total") return [`$${Number(value).toFixed(2)}`, name];
          return [value, name];
        }}
        labelFormatter={(label) => {
          const item = processedData.find(d => d.displayName === label);
          return item?.fullName || label;
        }}
      />
    </RadarChart>
  );

  // Alternative bar chart view for better clarity and handling more cashiers
  const renderBarChart = () => (
    <BarChart
      data={processedData}
      layout="vertical"
      margin={{ top: 5, right: 20, left: 75, bottom: 5 }}
    >
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis type="number" />
      <YAxis 
        type="category" 
        dataKey="displayName" 
        width={75}
        tick={{ fontSize: 12 }}
      />
      <Tooltip 
        formatter={(value, name) => {
          if (name === "Sales Total") return [`$${Number(value).toFixed(2)}`, name];
          return [value, name];
        }}
        labelFormatter={(label) => {
          const item = processedData.find(d => d.displayName === label);
          return item?.fullName || label;
        }}
      />
      <Legend />
      <Bar dataKey="amount" name="Sales Total" fill="#8884d8" />
      <Bar dataKey="transactions" name="Transactions" fill="#82ca9d" />
    </BarChart>
  );

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
        <div className="flex justify-end mb-2">
          <div className="flex space-x-2">
            <Button 
              variant={viewType === 'radar' ? 'default' : 'outline'}
              size="sm" 
              onClick={() => setViewType('radar')}
            >
              Radar View
            </Button>
            <Button 
              variant={viewType === 'bar' ? 'default' : 'outline'}
              size="sm" 
              onClick={() => setViewType('bar')}
            >
              Bar View
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            {viewType === 'radar' ? renderRadarChart() : renderBarChart()}
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

// CATEGORY BREAKDOWN CHART
export const CategoryBreakdownChart: React.FC<ChartProps> = ({ data, title, description }) => {
  const [viewType, setViewType] = useState<'vertical' | 'horizontal' | 'pie'>('vertical');
  
  // Process data to handle long category names
  const processedData = React.useMemo(() => {
    return data.map(item => ({
      ...item,
      // Format display name for charts
      displayName: item.category?.length > 15 ? item.category.substring(0, 15) + '...' : item.category,
      fullName: item.category // Keep original name for tooltips
    })).sort((a, b) => b.count - a.count); // Sort by count descending
  }, [data]);

  // Render vertical bar chart (default)
  const renderVerticalBarChart = () => (
    <BarChart
      data={processedData}
      margin={{ top: 5, right: 30, left: 90, bottom: 5 }}
      layout="vertical"
    >
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis type="number" />
      <YAxis 
        dataKey="displayName" 
        type="category" 
        width={90} 
        tick={{ fontSize: 11 }}
      />
      <Tooltip 
        formatter={(value: any, name: any) => {
          const numValue = Number(value);
          if (name === " " && numValue > 1000) return [`$${numValue.toFixed(2)}`, "Total Value"];
          return [value, name === " " ? (numValue < 1000 ? "Count" : "Value") : name];
        }}
        labelFormatter={(label: any) => {
          const item = processedData.find(d => d.displayName === label);
          return item?.fullName || label;
        }}
      />
      {/* Legend removed as requested */}
      <Bar dataKey="count" fill="#8884d8" name=" " />
      <Bar dataKey="value" fill="#82ca9d" name=" " />
    </BarChart>
  );

  // Render horizontal bar chart (for different perspective)
  const renderHorizontalBarChart = () => (
    <BarChart
      data={processedData}
      margin={{ top: 5, right: 30, left: 20, bottom: 90 }}
    >
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis 
        dataKey="displayName" 
        angle={-45} 
        textAnchor="end" 
        height={90}
        interval={0}
        tick={{ fontSize: 10 }}
        tickMargin={15}
      />
      <YAxis />
      <Tooltip 
        formatter={(value: any, name: any) => {
          const numValue = Number(value);
          if (name === " " && numValue > 1000) return [`$${numValue.toFixed(2)}`, "Total Value"];
          return [value, name === " " ? (numValue < 1000 ? "Count" : "Value") : name];
        }}
        labelFormatter={(label: any) => {
          const item = processedData.find(d => d.displayName === label);
          return item?.fullName || label;
        }}
      />
      {/* Legend removed as requested */}
      <Bar dataKey="count" fill="#8884d8" name=" " />
      <Bar dataKey="value" fill="#82ca9d" name=" " />
    </BarChart>
  );

  // Render pie chart (for proportion visualization)
  const renderPieChart = () => (
    <PieChart>
      <Pie
        data={processedData}
        cx="50%"
        cy="50%"
        labelLine={false}
        outerRadius={80}
        fill="#8884d8"
        dataKey="count"
        nameKey="displayName"
        label={({ percent }) => 
          percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : ''
        }
      >
        {processedData.map((entry, index) => (
          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
        ))}
      </Pie>
      <Tooltip 
        formatter={(value: any) => [`${value}`, 'Items']}
        labelFormatter={(label: any) => {
          const item = processedData.find(d => d.displayName === label);
          return item?.fullName || label;
        }}
      />
      {/* Legend removed per user request */}
    </PieChart>
  );

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
        <div className="flex justify-end mb-2">
          <div className="flex flex-wrap gap-2">
            <Button 
              variant={viewType === 'vertical' ? 'default' : 'outline'}
              size="sm" 
              onClick={() => setViewType('vertical')}
            >
              Vertical Bars
            </Button>
            <Button 
              variant={viewType === 'horizontal' ? 'default' : 'outline'}
              size="sm" 
              onClick={() => setViewType('horizontal')}
            >
              Horizontal Bars
            </Button>
            <Button 
              variant={viewType === 'pie' ? 'default' : 'outline'}
              size="sm" 
              onClick={() => setViewType('pie')}
            >
              Pie Chart
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            {viewType === 'vertical' ? renderVerticalBarChart() : 
             viewType === 'horizontal' ? renderHorizontalBarChart() : 
             renderPieChart()}
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};