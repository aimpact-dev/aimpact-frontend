use anchor_lang::prelude::*;

declare_id!("9Q6Cjj1ZfeJmf7Ec17Yq8NU3fNronYoVmvkrcGR1NtmD");

#[program]
pub mod src {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
