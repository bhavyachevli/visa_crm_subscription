import os
from utils.db import coordinator_db

def check_trials():
    tenants = list(coordinator_db.tenants.find().sort("createdAt", -1))
    if not tenants:
        print("No organizations found in the database.")
        return

    print("\n" + "="*95)
    print(f"{'COMPANY NAME':<25} | {'OWNER EMAIL':<25} | {'STATUS':<10} | {'TRIAL EXPIRES (UTC)':<18} | {'PLAN':<8}")
    print("="*95)
    for t in tenants:
        name = t.get("company_name", "N/A")
        email = t.get("owner_email", "N/A")
        status = t.get("subscription_status", "N/A")
        plan = t.get("planId", "starter")
        trial_ends = t.get("trial_ends_at")
        
        trial_ends_str = trial_ends.strftime("%Y-%m-%d %H:%M") if trial_ends else "N/A"
        
        print(f"{name[:24]:<25} | {email[:24]:<25} | {status:<10} | {trial_ends_str:<18} | {plan:<8}")
    print("="*95 + "\n")

if __name__ == "__main__":
    check_trials()
