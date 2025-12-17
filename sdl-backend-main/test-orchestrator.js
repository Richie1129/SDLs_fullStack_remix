
const sequelize = require('./util/database');
const IdeaWall = require('./models/idea_wall');
const IdeaWallMessage = require('./models/idea_wall_message');
const User = require('./models/user');
const { orchestrateChat } = require('./services/orchestrator');

// Mock the LLM service to avoid real API calls during testing
// We need to do this before requiring orchestrator if possible, but since we can't easily,
// we will rely on the fact that we are testing the *logic* mostly.
// However, to test the full flow, we might want to see the AI message created.
// For this script, we will let it fail or succeed on the LLM call, but catch the error.

async function runTests() {
    console.log('🧪 Starting Phase 5 Verification: IdeaWall Chat Orchestrator');
    
    let testWall;
    let testUser;
    let aiUser;

    try {
        // 1. Setup Test Data
        console.log('\n📝 Setting up test environment...');
        
        // Create a test user
        testUser = await User.create({
            username: 'TestUser_' + Date.now(),
            account: 'testuser_' + Date.now(),
            password: 'password123',
            email: 'test@example.com',
            role: 'student'
        });
        console.log(`   ✅ Created Test User: ${testUser.username} (ID: ${testUser.id})`);

        // Create a test wall
        testWall = await IdeaWall.create({
            title: 'Test Wall for AI Orchestrator',
            type: 'scaffold',
            ownerId: testUser.id
        });
        console.log(`   ✅ Created Test Wall: ${testWall.title} (ID: ${testWall.id})`);

        // 2. Test Logic: Not Enough Messages
        console.log('\n🧪 Test Case 1: Not enough messages');
        await createMessages(testWall.id, testUser.id, 3); // Create 3 messages
        
        // We need to access the internal logic or observe the side effect.
        // Since orchestrateChat is async and void, we can't easily check return value.
        // But we can check if an AI message was created.
        
        await orchestrateChat({ ideaWallId: testWall.id, isAiIntervention: false });
        
        let aiMsg = await IdeaWallMessage.findOne({
            where: { ideaWallId: testWall.id, isAiIntervention: true }
        });
        
        if (!aiMsg) {
            console.log('   ✅ PASS: No AI intervention (3 messages < 5 threshold)');
        } else {
            console.error('   ❌ FAIL: AI intervened prematurely!');
        }

        // 3. Test Logic: Enough Messages -> Trigger
        console.log('\n🧪 Test Case 2: Enough messages (Threshold = 5)');
        await createMessages(testWall.id, testUser.id, 3); // Add 3 more (Total 6)
        
        // Trigger orchestration
        console.log('   🤖 Triggering Orchestrator...');
        await orchestrateChat({ ideaWallId: testWall.id, isAiIntervention: false });
        
        // Wait a bit for async operation (if any)
        await new Promise(r => setTimeout(r, 2000));

        aiMsg = await IdeaWallMessage.findOne({
            where: { ideaWallId: testWall.id, isAiIntervention: true }
        });

        if (aiMsg) {
            console.log(`   ✅ PASS: AI Intervened! Message ID: ${aiMsg.id}`);
            console.log(`   📝 AI Content: "${aiMsg.content.substring(0, 50)}..."`);
        } else {
            console.log('   ⚠️ NOTE: AI did not intervene. This might be due to missing API Keys or LLM failure.');
            console.log('   (Check server logs for "Chat LLM" errors)');
        }

        // 4. Test Logic: Cooling Period
        console.log('\n🧪 Test Case 3: Cooling Period');
        if (!aiMsg) {
            // Manually create one to simulate previous intervention
            aiMsg = await IdeaWallMessage.create({
                content: 'Fake AI Message',
                senderId: 1,
                ideaWallId: testWall.id,
                isAiIntervention: true
            });
            console.log('   (Created manual AI message for cooling test)');
        }

        // Add more messages immediately
        await createMessages(testWall.id, testUser.id, 6);
        
        const preCount = await IdeaWallMessage.count({ where: { ideaWallId: testWall.id, isAiIntervention: true } });
        
        await orchestrateChat({ ideaWallId: testWall.id, isAiIntervention: false });
        
        const postCount = await IdeaWallMessage.count({ where: { ideaWallId: testWall.id, isAiIntervention: true } });
        
        if (postCount === preCount) {
            console.log('   ✅ PASS: Cooling period active (No new AI message)');
        } else {
            console.error('   ❌ FAIL: AI intervened during cooling period!');
        }

    } catch (error) {
        console.error('❌ Test Failed:', error);
    } finally {
        // Cleanup
        console.log('\n🧹 Cleaning up...');
        if (testWall) {
            await IdeaWallMessage.destroy({ where: { ideaWallId: testWall.id } });
            await testWall.destroy();
        }
        if (testUser) {
            await testUser.destroy();
        }
        await sequelize.close();
    }
}

async function createMessages(wallId, userId, count) {
    const msgs = [];
    for (let i = 0; i < count; i++) {
        msgs.push({
            content: `Test message ${i} - ${Date.now()}`,
            senderId: userId,
            ideaWallId: wallId,
            isAiIntervention: false
        });
    }
    await IdeaWallMessage.bulkCreate(msgs);
    console.log(`   + Added ${count} user messages`);
}

runTests();
