    // shared across all test files
pub struct TestEnv {
    pub svm: LiteSVM,
    pub payer: Keypair,
    pub client: Keypair,      // pays worker
    pub worker: Keypair,      // receives payment
    pub usdc_mint: Pubkey,
    pub client_ata: Pubkey,
    pub worker_ata: Pubkey,
}

pub fn setup() -> TestEnv {
    let mut svm = LiteSVM::new();

    // load all four programs
    svm.add_program_from_file(
        flowpay::ID,
        "../../target/deploy/flowpay.so"
    );
    svm.add_program_from_file(
        flowscore::ID,
        "../../target/deploy/flowscore.so"
    );
    // etc.
}