// Test script to debug client comments functionality
// This can be run in the browser console to test the database operations

async function testClientNotes() {
  console.log('🧪 Testing client comments functionality...');

  try {
    // Test 1: Check if we can read from clients table
    console.log('📖 Testing client table read...');
    const { data: clients, error: readError } = await supabase
      .from('clients')
              .select('id, name, email, client_notes')
      .limit(3);

    if (readError) {
      console.error('❌ Error reading clients:', readError);
      return;
    }

    console.log('✅ Successfully read clients:', clients);

    // Test 2: Try to update a client with comments
    if (clients && clients.length > 0) {
      const testClient = clients[0];
      console.log('🔄 Testing update for client:', testClient.name);

      const { data: updateResult, error: updateError } = await supabase
        .from('clients')
        .update({
          client_notes: `Test comment updated at ${new Date().toISOString()}`,
          updated_at: new Date().toISOString()
        })
        .eq('id', testClient.id)
        .select('id, name, email, client_notes, updated_at');

      if (updateError) {
        console.error('❌ Error updating client:', updateError);
        return;
      }

      console.log('✅ Successfully updated client:', updateResult);

      // Test 3: Verify the update worked
      const { data: verifyResult, error: verifyError } = await supabase
        .from('clients')
        .select('id, name, email, client_notes, updated_at')
        .eq('id', testClient.id)
        .single();

      if (verifyError) {
        console.error('❌ Error verifying update:', verifyError);
        return;
      }

      console.log('✅ Verification successful:', verifyResult);
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testClientNotes();
