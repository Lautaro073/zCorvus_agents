const express = require('express');
const router = express.Router();

const { authenticateToken } = require('../middlewares/auth.middleware');
const { isAdmin } = require('../middlewares/role.middleware');
const { getAdminUsers } = require('../controllers/admin/users.controller');
const { getAdminSubscriptions } = require('../controllers/admin/subscriptions.controller');
const { getAdminMetrics } = require('../controllers/admin/metrics.controller');
const { getAdminPreferences, saveAdminPreferences } = require('../controllers/admin/preferences.controller');

router.use(authenticateToken, isAdmin);

router.get('/', (req, res) => {
    return res.status(200).json({
        success: true,
        message: 'Admin API ready',
        data: {
            scope: 'admin',
            roleRequired: 'admin'
        },
        pagination: null,
        filtersApplied: {},
        generatedAt: new Date().toISOString()
    });
});

router.get('/users', getAdminUsers);
router.get('/subscriptions', getAdminSubscriptions);
router.get('/metrics', getAdminMetrics);
router.get('/preferences', getAdminPreferences);
router.patch('/preferences', saveAdminPreferences);
router.put('/preferences', saveAdminPreferences);

module.exports = router;
