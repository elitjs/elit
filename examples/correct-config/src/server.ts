
import { ServerRouter, json, text, type ServerRouteContext } from '@elitjs/server';

// Cache bust: timestamp-1736438400000
export const router = new ServerRouter();

// GET example
router.get('/api/hello', async (ctx: ServerRouteContext) => {
    ctx.res.setHeader('Content-Type', 'text/html; charset=UTF-8');
    ctx.res.end("Hello from Elit ServerRouter!");
});

// GET with params
router.get('/api/users/:id', async (ctx: ServerRouteContext) => {
    json(ctx.res, { 
        userId: ctx.params.id,
        message: 'User retrieved successfully'
    });
});

// POST example
router.post('/api/users', async (ctx: ServerRouteContext) => {
    json(ctx.res, { 
        message: 'User created',
        data: ctx.body 
    }, 201);
});

// PUT example
router.put('/api/users/:id', async (ctx: ServerRouteContext) => {
    json(ctx.res, { 
        message: 'User updated',
        userId: ctx.params.id,
        data: ctx.body 
    });
});

// PATCH example
router.patch('/api/users/:id', async (ctx: ServerRouteContext) => {
    json(ctx.res, { 
        message: 'User partially updated',
        userId: ctx.params.id,
        data: ctx.body 
    });
});

// DELETE example
router.delete('/api/users/:id', async (ctx: ServerRouteContext) => {
    json(ctx.res, { 
        message: 'User deleted',
        userId: ctx.params.id 
    });
});

// OPTIONS example
router.options('/api/users', async (ctx: ServerRouteContext) => {
    ctx.res.setHeader('Allow', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    ctx.res.writeHead(204);
    ctx.res.end();
});

export const server = router