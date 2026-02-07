import { CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';

import { Button } from '@/shared/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/shared/components/ui/dialog';

import { FeedbackState } from '../profileTypes';

interface FeedbackDialogProps {
    feedback: FeedbackState;
    onClose: () => void;
}

export default function FeedbackDialog({ feedback, onClose }: FeedbackDialogProps) {
    const isSuccess = feedback?.type === 'success';
    
    return (
        <Dialog open={Boolean(feedback)} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-md border-0 bg-white p-0 shadow-2xl overflow-hidden">
                {/* Gradient Header with Icon */}
                <div className={`relative px-6 pt-8 pb-6 ${
                    isSuccess 
                        ? 'bg-gradient-to-br from-green-500 via-green-600 to-emerald-600' 
                        : 'bg-gradient-to-br from-red-500 via-red-600 to-rose-600'
                }`}>
                    {/* Decorative circles */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12 blur-xl" />
                    
                    <DialogHeader className="relative space-y-4 text-center">
                        {/* Animated Icon */}
                        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-lg animate-in zoom-in-50 duration-300">
                            {isSuccess ? (
                                <CheckCircle2 className="h-10 w-10 text-green-600 animate-in zoom-in-75 duration-500" />
                            ) : (
                                <XCircle className="h-10 w-10 text-red-600 animate-in zoom-in-75 duration-500" />
                            )}
                        </div>
                        
                        {/* Title */}
                        <DialogTitle className="text-2xl font-bold text-white animate-in fade-in-50 slide-in-from-bottom-3 duration-500">
                            {isSuccess ? ' Berhasil Tersimpan!' : ' Gagal Menyimpan'}
                        </DialogTitle>
                    </DialogHeader>
                </div>

                {/* Content Area */}
                <div className="px-6 py-6 space-y-6">
                    {/* Message */}
                    <DialogDescription className="text-center text-base text-slate-600 leading-relaxed animate-in fade-in-50 slide-in-from-bottom-4 duration-700">
                        {feedback?.message || (isSuccess 
                            ? 'Data profil Anda telah berhasil diperbarui.'
                            : 'Gagal menyimpan data, silakan coba lagi.'
                        )}
                    </DialogDescription>

                    {/* Action Button */}
                    <DialogFooter className="sm:justify-center animate-in fade-in-50 slide-in-from-bottom-5 duration-1000">
                        <Button
                            type="button"
                            onClick={onClose}
                            className={`group relative w-full overflow-hidden font-semibold shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-105 active:scale-95 ${
                                isSuccess
                                    ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500'
                                    : 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500'
                            }`}
                        >
                            {/* Button shine effect */}
                            <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                            
                            <span className="relative flex items-center justify-center gap-2">
                                {isSuccess ? ' Mengerti' : 'Coba Lagi'}
                            </span>
                        </Button>
                    </DialogFooter>
                </div>
            </DialogContent>
        </Dialog>
    );
}



