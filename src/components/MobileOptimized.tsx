import React from 'react'

// Mobile-optimized container component
export const MobileContainer: React.FC<{ children: React.ReactNode; className?: string }> = ({ 
  children, 
  className = '' 
}) => (
  <div className={`px-4 sm:px-6 lg:px-8 ${className}`}>
    {children}
  </div>
)

// Mobile-optimized card component
export const MobileCard: React.FC<{ children: React.ReactNode; className?: string }> = ({ 
  children, 
  className = '' 
}) => (
  <div className={`bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-6 ${className}`}>
    {children}
  </div>
)

// Mobile-optimized grid component
export const MobileGrid: React.FC<{ 
  children: React.ReactNode
  cols?: string
  className?: string 
}> = ({ 
  children, 
  cols = 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  className = '' 
}) => (
  <div className={`grid ${cols} gap-4 ${className}`}>
    {children}
  </div>
)

// Mobile-optimized button component
export const MobileButton: React.FC<{ 
  children: React.ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  className?: string
  disabled?: boolean
}> = ({ 
  children, 
  onClick, 
  variant = 'primary',
  size = 'md',
  className = '',
  disabled = false
}) => {
  const baseClasses = 'font-medium rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2'
  
  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
    secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300 focus:ring-gray-500',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500'
  }
  
  const sizeClasses = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-3 text-sm sm:text-base',
    lg: 'px-6 py-4 text-base sm:text-lg'
  }
  
  const disabledClasses = disabled ? 'opacity-50 cursor-not-allowed' : ''
  
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${disabledClasses} ${className}`}
    >
      {children}
    </button>
  )
}

// Mobile-optimized table component
export const MobileTable: React.FC<{ 
  children: React.ReactNode
  className?: string 
}> = ({ children, className = '' }) => (
  <div className="overflow-x-auto">
    <table className={`min-w-full divide-y divide-gray-200 ${className}`}>
      {children}
    </table>
  </div>
)

// Mobile-optimized modal component
export const MobileModal: React.FC<{ 
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null
  
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />
        <div className="relative bg-white rounded-xl sm:rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
          <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900">{title}</h3>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}

// Mobile-optimized form input component
export const MobileInput: React.FC<{ 
  type?: string
  placeholder?: string
  value?: string
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  className?: string
}> = ({ type = 'text', placeholder, value, onChange, className = '' }) => (
  <input
    type={type}
    placeholder={placeholder}
    value={value}
    onChange={onChange}
    className={`w-full px-4 py-3 text-base border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent ${className}`}
  />
)

export default {
  MobileContainer,
  MobileCard,
  MobileGrid,
  MobileButton,
  MobileTable,
  MobileModal,
  MobileInput
}