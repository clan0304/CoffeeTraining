# Supabase Migrations

This folder contains SQL migration files for the Supabase database.

## How to Run

Run these migrations in order via **Supabase Dashboard > SQL Editor**:

### User Profiles
1. `001_create_user_profiles.sql` - Creates the user_profiles table
2. `002_user_profiles_rls_policies.sql` - RLS policies + public_profiles view
3. `003_create_profile_photos_bucket.sql` - Storage bucket for photos

### Rooms & Training System
4. `004_create_rooms.sql` - Rooms table + code generator function
5. `005_create_room_players.sql` - Players in each room
6. `006_create_room_coffees.sql` - Coffee library per room
7. `007_create_room_sets.sql` - Training rounds/sets
8. `008_create_room_set_rows.sql` - 8 triangulation rows per set
9. `009_create_player_answers.sql` - Player selections
10. `010_rooms_rls_policies.sql` - RLS policies for all room tables

## Prerequisites

Before running migrations, configure Clerk as an auth provider in Supabase:

1. Go to **Authentication > Sign In / Up > Third-party Auth**
2. Add Clerk with your Clerk domain

## Naming Convention

```
{number}_{description}.sql
```

- `number`: Sequential order (001, 002, etc.)
- `description`: Brief snake_case description

## Adding New Migrations

1. Create a new file with the next number
2. Add migration header comment with date and description
3. Update this README if needed
