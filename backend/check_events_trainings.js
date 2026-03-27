const { pool } = require('./config/database');

async function checkEventsTrainings() {
    const orgId = 1;
    try {
        const [events] = await pool.execute('SELECT id, title, created_by FROM events WHERE organization_id = ?', [orgId]);
        console.log(`--- Events for Org ${orgId} ---`);
        console.table(events);

        const [trainings] = await pool.execute('SELECT id, training_title, created_by FROM trainings WHERE organization_id = ?', [orgId]);
        console.log(`--- Trainings for Org ${orgId} ---`);
        console.table(trainings);
    } catch (error) {
        console.error('Error:', error.message);
    }
    process.exit(0);
}

checkEventsTrainings();
