import { toast as hotToast } from 'react-hot-toast';

interface ToastProps {
  title: string;
  description?: string;
  variant?: 'default' | 'destructive';
}

export function useToast() {
  const toast = ({ title, description, variant = 'default' }: ToastProps) => {
    const message = description ? `${title}: ${description}` : title;
    
    if (variant === 'destructive') {
      hotToast.error(message);
    } else {
      hotToast.success(message);
    }
  };

  return { toast };
}


