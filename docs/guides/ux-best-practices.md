# User Experience Best Practices

Creating intuitive and accessible user experiences is crucial for plugin adoption and user satisfaction. This guide covers interface design principles, accessibility standards, error messaging, and user feedback patterns.

## Table of Contents

- [Interface Design Principles](#interface-design-principles)
- [Accessibility Standards](#accessibility-standards)
- [Error Messaging](#error-messaging)
- [Loading States](#loading-states)
- [User Feedback Patterns](#user-feedback-patterns)
- [Responsive Design](#responsive-design)

## Interface Design Principles

### Consistency and Familiarity

```typescript
// ✅ Good: Consistent component patterns
export const PluginButton: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  children,
  onClick,
  ...props
}) => {
  const baseClasses = 'px-4 py-2 rounded-md font-medium transition-colors focus:outline-none focus:ring-2';
  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
    secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500'
  };

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      }`}
      disabled={disabled || loading}
      onClick={onClick}
      {...props}
    >
      {loading ? (
        <span className="flex items-center">
          <LoadingSpinner className="mr-2" />
          Loading...
        </span>
      ) : (
        children
      )}
    </button>
  );
};
```

### Progressive Disclosure

```typescript
// ✅ Good: Progressive disclosure for complex forms
export const WeatherConfigForm: React.FC = () => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <form className="space-y-6">
      {/* Basic Configuration */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Basic Settings</h3>
        
        <FormField label="API Key" required>
          <input
            type="password"
            className="w-full px-3 py-2 border rounded-md"
            placeholder="Enter your weather API key"
          />
        </FormField>

        <FormField label="Default Location">
          <input
            type="text"
            className="w-full px-3 py-2 border rounded-md"
            placeholder="e.g., London, UK"
          />
        </FormField>
      </div>

      {/* Advanced Settings Toggle */}
      <div className="border-t pt-6">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center text-blue-600 hover:text-blue-700"
        >
          <ChevronIcon 
            className={`mr-2 transform transition-transform ${showAdvanced ? 'rotate-90' : ''}`} 
          />
          Advanced Settings
        </button>

        {showAdvanced && (
          <div className="mt-4 space-y-4 pl-6 border-l-2 border-gray-200">
            <FormField label="Cache Duration (minutes)">
              <input
                type="number"
                min="1"
                max="60"
                className="w-full px-3 py-2 border rounded-md"
              />
            </FormField>
          </div>
        )}
      </div>
    </form>
  );
};
```

## Accessibility Standards

### Keyboard Navigation

```typescript
// ✅ Good: Keyboard accessible dropdown
export const AccessibleDropdown: React.FC<DropdownProps> = ({
  options,
  value,
  onChange,
  placeholder = "Select an option"
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const handleKeyDown = (event: KeyboardEvent) => {
    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (isOpen && focusedIndex >= 0) {
          onChange(options[focusedIndex]);
          setIsOpen(false);
        } else {
          setIsOpen(!isOpen);
        }
        break;
      
      case 'Escape':
        setIsOpen(false);
        break;
      
      case 'ArrowDown':
        event.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else {
          setFocusedIndex(prev => 
            prev < options.length - 1 ? prev + 1 : 0
          );
        }
        break;
      
      case 'ArrowUp':
        event.preventDefault();
        if (isOpen) {
          setFocusedIndex(prev => 
            prev > 0 ? prev - 1 : options.length - 1
          );
        }
        break;
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        className="w-full px-3 py-2 text-left bg-white border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        {value?.label || placeholder}
      </button>

      {isOpen && (
        <ul
          className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg"
          role="listbox"
        >
          {options.map((option, index) => (
            <li
              key={option.value}
              className={`px-3 py-2 cursor-pointer ${
                index === focusedIndex ? 'bg-blue-100' : 'hover:bg-gray-100'
              }`}
              role="option"
              aria-selected={value?.value === option.value}
              onClick={() => {
                onChange(option);
                setIsOpen(false);
              }}
            >
              {option.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
```

### Screen Reader Support

```typescript
// ✅ Good: Screen reader accessible status messages
export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  message
}) => {
  const statusConfig = {
    success: {
      color: 'text-green-800 bg-green-100',
      icon: <CheckCircleIcon className="w-5 h-5" />,
      ariaLabel: 'Success'
    },
    error: {
      color: 'text-red-800 bg-red-100',
      icon: <XCircleIcon className="w-5 h-5" />,
      ariaLabel: 'Error'
    }
  };

  const config = statusConfig[status];

  return (
    <div
      className={`flex items-center p-3 rounded-md ${config.color}`}
      role="alert"
      aria-label={config.ariaLabel}
    >
      <div className="mr-3" aria-hidden="true">
        {config.icon}
      </div>
      <span className="text-sm font-medium">{message}</span>
    </div>
  );
};
```

## Error Messaging

### User-Friendly Error Messages

```typescript
// ✅ Good: Helpful error messages with actions
export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  title,
  message,
  actions
}) => (
  <div className="flex flex-col items-center justify-center p-8 text-center">
    <div className="w-16 h-16 mb-4 text-red-500">
      <ExclamationTriangleIcon />
    </div>
    
    <h3 className="mb-2 text-lg font-semibold text-gray-900">{title}</h3>
    <p className="mb-6 text-sm text-gray-600 max-w-md">{message}</p>
    
    <div className="flex space-x-3">
      {actions.map((action, index) => (
        <PluginButton
          key={index}
          variant={action.primary ? 'primary' : 'secondary'}
          onClick={action.action}
        >
          {action.label}
        </PluginButton>
      ))}
    </div>
  </div>
);

// Error message configurations
export const errorMessages = {
  NetworkError: {
    title: 'Connection Problem',
    message: 'Unable to connect to the service. Please check your internet connection and try again.',
    actions: [
      { label: 'Try Again', action: () => retry(), primary: true },
      { label: 'Check Settings', action: () => openSettings() }
    ]
  },
  ValidationError: {
    title: 'Invalid Input',
    message: 'Please check your input and try again.',
    actions: [
      { label: 'Go Back', action: () => goBack(), primary: true }
    ]
  }
};
```

## Loading States

### Skeleton Loading

```typescript
// ✅ Good: Skeleton that matches content structure
export const WeatherSkeleton: React.FC = () => (
  <div className="bg-white rounded-lg shadow-md p-6 animate-pulse">
    <div className="flex items-center justify-between mb-4">
      <div>
        <div className="h-8 bg-gray-200 rounded w-32 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-24"></div>
      </div>
      <div className="text-right">
        <div className="h-12 bg-gray-200 rounded w-16 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-20"></div>
      </div>
    </div>

    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
      {[1, 2].map((i) => (
        <div key={i} className="flex items-center space-x-2">
          <div className="w-6 h-6 bg-gray-200 rounded"></div>
          <div>
            <div className="h-3 bg-gray-200 rounded w-16 mb-1"></div>
            <div className="h-4 bg-gray-200 rounded w-12"></div>
          </div>
        </div>
      ))}
    </div>
  </div>
);
```

## User Feedback Patterns

### Toast Notifications

```typescript
// ✅ Good: Non-intrusive toast notifications
export const useToast = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Date.now().toString();
    const newToast = { ...toast, id };
    
    setToasts(prev => [...prev, newToast]);
    
    // Auto-remove after duration
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, toast.duration || 5000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return { toasts, addToast, removeToast };
};

export const ToastContainer: React.FC<{ toasts: Toast[] }> = ({ toasts }) => (
  <div className="fixed top-4 right-4 z-50 space-y-2">
    {toasts.map(toast => (
      <div
        key={toast.id}
        className={`p-4 rounded-md shadow-lg max-w-sm ${
          toast.type === 'success' ? 'bg-green-100 text-green-800' :
          toast.type === 'error' ? 'bg-red-100 text-red-800' :
          'bg-blue-100 text-blue-800'
        }`}
        role="alert"
      >
        <div className="flex items-start">
          <div className="flex-1">
            <p className="text-sm font-medium">{toast.title}</p>
            {toast.message && (
              <p className="text-sm mt-1">{toast.message}</p>
            )}
          </div>
          <button
            onClick={() => removeToast(toast.id)}
            className="ml-3 text-gray-400 hover:text-gray-600"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    ))}
  </div>
);
```

## Responsive Design

### Mobile-First Approach

```typescript
// ✅ Good: Responsive component design
export const ResponsiveWeatherWidget: React.FC = ({ data }) => (
  <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
    {/* Mobile: Stack vertically, Desktop: Side by side */}
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
      <div className="mb-2 sm:mb-0">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">{data.location}</h2>
        <p className="text-xs sm:text-sm text-gray-600">{formatDate(data.timestamp)}</p>
      </div>
      <div className="text-left sm:text-right">
        <div className="text-3xl sm:text-4xl font-light text-gray-900">
          {Math.round(data.temperature)}°
        </div>
        <p className="text-sm text-gray-600 capitalize">{data.description}</p>
      </div>
    </div>

    {/* Responsive grid */}
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 pt-4 border-t border-gray-200">
      <WeatherMetric icon={<HumidityIcon />} label="Humidity" value={`${data.humidity}%`} />
      <WeatherMetric icon={<WindIcon />} label="Wind" value={`${data.windSpeed} mph`} />
      <WeatherMetric icon={<PressureIcon />} label="Pressure" value={`${data.pressure} hPa`} />
      <WeatherMetric icon={<VisibilityIcon />} label="Visibility" value={`${data.visibility} mi`} />
    </div>

    {/* Mobile: Stack buttons, Desktop: Side by side */}
    <div className="mt-4 flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-2 sm:space-y-0">
      <button className="text-blue-600 hover:text-blue-700 text-sm flex items-center justify-center sm:justify-start">
        <RefreshIcon className="mr-1 w-4 h-4" />
        Refresh
      </button>
      <button className="text-blue-600 hover:text-blue-700 text-sm">
        View Forecast →
      </button>
    </div>
  </div>
);
```

### Touch-Friendly Interactions

```typescript
// ✅ Good: Touch-optimized components
export const TouchFriendlyButton: React.FC<TouchButtonProps> = ({
  children,
  onClick,
  variant = 'primary'
}) => (
  <button
    className={`
      min-h-[44px] min-w-[44px] px-6 py-3 rounded-md font-medium
      transition-all duration-200 ease-in-out
      active:scale-95 active:shadow-inner
      focus:outline-none focus:ring-2 focus:ring-offset-2
      ${variant === 'primary' 
        ? 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500' 
        : 'bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500'
      }
    `}
    onClick={onClick}
  >
    {children}
  </button>
);

// Touch-optimized slider
export const TouchSlider: React.FC<SliderProps> = ({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1
}) => (
  <div className="relative w-full">
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="
        w-full h-8 bg-gray-200 rounded-lg appearance-none cursor-pointer
        slider:h-6 slider:w-6 slider:rounded-full slider:bg-blue-600
        slider:cursor-pointer slider:shadow-md
        focus:outline-none focus:ring-2 focus:ring-blue-500
      "
    />
    <div className="flex justify-between text-xs text-gray-500 mt-1">
      <span>{min}</span>
      <span>{max}</span>
    </div>
  </div>
);
```

This comprehensive UX guide ensures your Qirvo plugins provide excellent user experiences across all devices and accessibility needs.

---

**Next**: [Deployment Best Practices](./deployment-best-practices.md)
