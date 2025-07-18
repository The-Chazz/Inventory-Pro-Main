import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

// Define user schema
const userSchema = z.object({
  name: z.string().min(1, "Full name is required"),
  username: z.string().min(1, "Username is required"),
  role: z.string().min(1, "Role is required"),
  status: z.string().default("Active"),
  pin: z.string().length(4, "PIN must be 4 digits").regex(/^\d{4}$/, "PIN must be 4 digits")
});

interface AddUserFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

const AddUserForm: React.FC<AddUserFormProps> = ({
  onSuccess,
  onCancel
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  
  // Initialize form
  const form = useForm({
    resolver: zodResolver(userSchema),
    defaultValues: {
      name: "",
      username: "",
      role: "",
      status: "Active",
      pin: ""
    }
  });

  const onSubmit = async (data: any) => {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "User added successfully",
        });
        
        // Invalidate queries to refresh data
        queryClient.invalidateQueries({ queryKey: ['/api/users'] });
        
        // If success callback is provided, call it
        if (onSuccess) {
          onSuccess();
        }
        
        // Reset the form
        form.reset();
      } else {
        const error = await response.json();
        throw new Error(error.message || "Failed to add user");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "An error occurred while adding the user",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-4">Add New User</h2>
      
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Full Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Full Name
            </label>
            <input
              id="name"
              type="text"
              {...form.register("name")}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {form.formState.errors.name && (
              <p className="mt-1 text-xs text-red-600">{form.formState.errors.name.message}</p>
            )}
          </div>

          {/* Username */}
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
              Username
            </label>
            <input
              id="username"
              type="text"
              {...form.register("username")}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {form.formState.errors.username && (
              <p className="mt-1 text-xs text-red-600">{form.formState.errors.username.message}</p>
            )}
          </div>

          {/* PIN */}
          <div>
            <label htmlFor="pin" className="block text-sm font-medium text-gray-700 mb-1">
              PIN (4 digits)
            </label>
            <input
              id="pin"
              type="password"
              maxLength={4}
              inputMode="numeric"
              {...form.register("pin")}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {form.formState.errors.pin && (
              <p className="mt-1 text-xs text-red-600">{form.formState.errors.pin.message}</p>
            )}
          </div>

          {/* Role */}
          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
              Role
            </label>
            <select
              id="role"
              {...form.register("role")}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Role</option>
              <option value="Administrator">Administrator</option>
              <option value="Manager">Manager</option>
              <option value="Cashier">Cashier</option>
              <option value="Stocker">Stocker</option>
            </select>
            {form.formState.errors.role && (
              <p className="mt-1 text-xs text-red-600">{form.formState.errors.role.message}</p>
            )}
          </div>

          {/* Status */}
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              id="status"
              {...form.register("status")}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
            {form.formState.errors.status && (
              <p className="mt-1 text-xs text-red-600">{form.formState.errors.status.message}</p>
            )}
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-3 mt-6">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {isSubmitting ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </span>
            ) : (
              "Add User"
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddUserForm;