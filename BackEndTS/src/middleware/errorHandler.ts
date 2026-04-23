import type { Request, Response, NextFunction } from 'express';

export const errorHandler = (err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.log("Error:", err.message);
    const isPayloadTooLarge = err.name === "PayloadTooLargeError";
    const statusCode = isPayloadTooLarge
        ? 413
        : (res.statusCode !== 200 ? res.statusCode : 500);

    res.status(statusCode).json({
        message: isPayloadTooLarge
            ? "Payload too large. Please choose a smaller image."
            : (err.message || 'Internal Server Error'),
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
}