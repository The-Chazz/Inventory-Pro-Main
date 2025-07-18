/**
 * Login Page Component
 * 
 * Provides secure login functionality with username and PIN authentication.
 * Includes form validation, error handling, and security measures.
 */
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Define schema for login credentials validation
const loginSchema = z.object({
  username: z
    .string()
    .min(1, "Username is required")
    .max(50, "Username is too long")
    .trim(),
  pin: z
    .string()
    .length(4, "PIN must be 4 digits")
    .regex(/^\d{4}$/, "PIN must contain only numbers")
});

type LoginFormValues = z.infer<typeof loginSchema>;

/**
 * Login Component
 * Handles authentication and secure session management
 */
const Login = () => {
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<Date | null>(null);
  const { toast } = useToast();
  
  /**
   * Clear any existing user sessions on login page load
   * This ensures no sessions persist if a user navigates directly to login
   */
  useEffect(() => {
    sessionStorage.removeItem("user");
    document.title = "Inventory Pro | Login";
    
    // Check for existing lockout
    const savedLockout = localStorage.getItem("loginLockout");
    if (savedLockout) {
      const lockoutTime = new Date(savedLockout);
      if (lockoutTime > new Date()) {
        setLockoutUntil(lockoutTime);
      } else {
        // Clear expired lockout
        localStorage.removeItem("loginLockout");
        localStorage.removeItem("loginAttempts");
      }
    }
    
    // Restore login attempts counter
    const savedAttempts = localStorage.getItem("loginAttempts");
    if (savedAttempts) {
      setLoginAttempts(parseInt(savedAttempts, 10));
    }
  }, []);
  
  // Initialize form with validation
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      pin: ""
    }
  });

  /**
   * Handles the form submission and authentication process
   * Implements security measures like rate limiting and lockouts
   */
  const onSubmit = async (data: LoginFormValues) => {
    // Security check for login rate limiting
    if (lockoutUntil && lockoutUntil > new Date()) {
      const remainingMinutes = Math.ceil((lockoutUntil.getTime() - new Date().getTime()) / 60000);
      toast({
        title: "Account Temporarily Locked",
        description: `Too many failed login attempts. Please try again in ${remainingMinutes} minutes.`,
        variant: "destructive"
      });
      return;
    }
    
    setIsLoading(true);
    try {
      // Sanitize input data
      const sanitizedData = {
        username: data.username.trim(),
        pin: data.pin
      };
      
      // Send login request
      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(sanitizedData),
        // Add security headers
        credentials: "same-origin"
      });

      const result = await response.json();
      
      if (response.ok && result.success) {
        // Reset login attempts on success
        setLoginAttempts(0);
        localStorage.removeItem("loginAttempts");
        localStorage.removeItem("loginLockout");
        
        toast({
          title: "Login Successful",
          description: `Welcome back, ${result.user.name}!`,
        });
        
        // Store user info in sessionStorage with current timestamp
        const userData = {
          ...result.user,
          lastActive: new Date().toISOString()
        };
        sessionStorage.setItem("user", JSON.stringify(userData));
        
        // Redirect to dashboard
        setLocation("/dashboard");
      } else {
        // Handle failed login
        const newAttempts = loginAttempts + 1;
        setLoginAttempts(newAttempts);
        localStorage.setItem("loginAttempts", newAttempts.toString());
        
        // Lock account after 5 failed attempts
        if (newAttempts >= 5) {
          const lockoutTime = new Date();
          // Lock for 15 minutes
          lockoutTime.setMinutes(lockoutTime.getMinutes() + 15);
          setLockoutUntil(lockoutTime);
          localStorage.setItem("loginLockout", lockoutTime.toISOString());
          
          throw new Error("Too many failed login attempts. Account locked for 15 minutes.");
        }
        
        throw new Error(result.error || "Invalid username or PIN");
      }
    } catch (error: any) {
      // Log and display error message
      console.error("Login error:", error.message);
      
      toast({
        title: "Login Failed",
        description: error.message || "Invalid username or PIN. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handles PIN input with client-side validation
   * Only allows numeric input and limits to 4 digits
   */
  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Only allow numeric input up to 4 digits
    if (/^\d*$/.test(value) && value.length <= 4) {
      form.setValue("pin", value);
    }
  };

  /**
   * Display a message if the account is temporarily locked
   */
  const renderLockoutMessage = () => {
    if (lockoutUntil && lockoutUntil > new Date()) {
      const remainingMinutes = Math.ceil((lockoutUntil.getTime() - new Date().getTime()) / 60000);
      return (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
          <div className="flex">
            <div>
              <h3 className="text-sm font-medium text-red-800">Account Temporarily Locked</h3>
              <p className="text-sm text-red-700 mt-1">
                Too many failed login attempts. Please try again in {remainingMinutes} minute{remainingMinutes !== 1 ? 's' : ''}.
              </p>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-blue-50 to-white p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-blue-800 pb-1">Inventory Pro</h1>
          <h2 className="mt-6 text-3xl font-semibold tracking-tight text-gray-900">Sign in</h2>
          <p className="mt-2 text-sm text-gray-600">
            Enter your credentials to access the system
          </p>
        </div>
        
        {/* Display lockout message if account is locked */}
        {renderLockoutMessage()}
        
        <form onSubmit={form.handleSubmit(onSubmit)} className="mt-8 space-y-6">
          <div className="space-y-4 rounded-md shadow-sm">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                Username
              </label>
              <input
                id="username"
                type="text"
                autoComplete="username"
                {...form.register("username")}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                placeholder="Username"
                autoFocus
                disabled={lockoutUntil !== null && lockoutUntil > new Date()}
                aria-invalid={!!form.formState.errors.username}
                aria-describedby="username-error"
              />
              {form.formState.errors.username && (
                <p id="username-error" role="alert" className="mt-1 text-xs text-red-600">
                  {form.formState.errors.username.message}
                </p>
              )}
            </div>
            
            <div>
              <label htmlFor="pin" className="block text-sm font-medium text-gray-700">
                PIN
              </label>
              <div className="relative">
                <input
                  id="pin"
                  type="password"
                  autoComplete="current-password"
                  {...form.register("pin")}
                  onChange={handlePinChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                  placeholder="4-digit PIN"
                  maxLength={4}
                  disabled={lockoutUntil !== null && lockoutUntil > new Date()}
                  aria-invalid={!!form.formState.errors.pin}
                  aria-describedby="pin-error"
                />
              </div>
              {form.formState.errors.pin && (
                <p id="pin-error" role="alert" className="mt-1 text-xs text-red-600">
                  {form.formState.errors.pin.message}
                </p>
              )}
            </div>
          </div>

          {/* Failed login counter warning */}
          {loginAttempts > 0 && loginAttempts < 5 && (
            <div className="text-amber-600 text-sm">
              <p>Failed login attempts: {loginAttempts}/5</p>
              <p className="text-xs">Your account will be temporarily locked after 5 failed attempts.</p>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={isLoading || (lockoutUntil !== null && lockoutUntil > new Date())}
              className="group relative flex w-full justify-center rounded-md border border-transparent bg-blue-600 py-2 px-4 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-70"
              aria-label="Sign in"
            >
              {isLoading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Signing in...</span>
                </span>
              ) : (
                "Sign in"
              )}
            </button>
          </div>
        </form>
        
        <div className="text-center text-sm text-gray-600">
          <p className="mt-4">Please contact your system administrator for login credentials.</p>
        </div>
        
        {/* Security notice */}
        <div className="text-center text-xs text-gray-500 mt-8">
          <p>This system is for authorized personnel only.</p>
          <p>All login attempts are monitored and recorded.</p>
        </div>
      </div>
    </div>
  );
};

export default Login;