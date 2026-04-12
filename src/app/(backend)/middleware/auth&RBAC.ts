// TODO (Dev C): Implement gatekeeper logic
// Verify the user has a valid token
// Verify the user's role is allowed for this endpoint
export const checkRole = (requiredRole: string) => {
    return async (req: Request, res: Response, next: Function) => {
        // Code here
    }
}