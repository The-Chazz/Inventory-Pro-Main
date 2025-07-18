import { useAppContext } from "@/context/AppContext";

/**
 * Header component props
 */
interface HeaderProps {
  title: string;
  description?: string;
}

/**
 * Header Component
 * Main top navigation with title and optional description
 */
const Header: React.FC<HeaderProps> = ({ title, description }) => {
  const { currentPage } = useAppContext();

  return (
    <header className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
        <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-gray-500">{description}</p>
        )}
      </div>
    </header>
  );
};

export default Header;
