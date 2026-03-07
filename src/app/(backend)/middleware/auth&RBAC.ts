// Todo (Dev C): Viết logic gác cổng
// Kiểm tra user có token không? 
// Role của user có được phép truy cập endpoint này không?
export const checkRole = (requiredRole: string) => {
    return async (req: Request, res: Response, next: Function) => {
        // Code here
    }
}