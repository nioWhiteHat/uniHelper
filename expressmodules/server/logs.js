const Logs = (req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - User: ${req.user ? req.user.id : 'Guest'}`);
    console.log(req.body);
    next();
};
module.exports = {
    Logs
};