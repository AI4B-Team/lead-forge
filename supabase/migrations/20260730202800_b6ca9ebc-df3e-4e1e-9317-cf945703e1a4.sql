INSERT INTO public.messages (workspace_id, campaign_id, lead_id, direction, body, status, is_optout, is_bot, created_at, read_at) VALUES
-- Thread 1: interested reply
('acab352f-7602-4ed7-970e-b9f7e00cf40c','81b89e19-d7ef-4c9f-92c0-c00e9312bb7c','6aa8060b-b470-4ba4-b900-c93a47c4fb0a','outbound','Hi — quick question about your HVAC service in Hillsborough. Are you taking on new commercial accounts this quarter?','delivered',false,false, now() - interval '3 hours', now() - interval '3 hours'),
('acab352f-7602-4ed7-970e-b9f7e00cf40c','81b89e19-d7ef-4c9f-92c0-c00e9312bb7c','6aa8060b-b470-4ba4-b900-c93a47c4fb0a','inbound','Yes we are. What kind of property?','received',false,false, now() - interval '2 hours 41 minutes', NULL),
('acab352f-7602-4ed7-970e-b9f7e00cf40c','81b89e19-d7ef-4c9f-92c0-c00e9312bb7c','6aa8060b-b470-4ba4-b900-c93a47c4fb0a','outbound','A 12-unit building off Fowler. Would a quick 10-minute call this week work?','delivered',false,true, now() - interval '2 hours 39 minutes', now() - interval '2 hours 39 minutes'),
('acab352f-7602-4ed7-970e-b9f7e00cf40c','81b89e19-d7ef-4c9f-92c0-c00e9312bb7c','6aa8060b-b470-4ba4-b900-c93a47c4fb0a','inbound','Thursday morning works. Call me at 9.','received',false,false, now() - interval '18 minutes', NULL),
-- Thread 2: asking for details
('acab352f-7602-4ed7-970e-b9f7e00cf40c','81b89e19-d7ef-4c9f-92c0-c00e9312bb7c','b4121b6c-180c-46a1-a6fa-61116c824dbf','outbound','Hi — quick question about your HVAC service in Pasco. Are you booking installs in August?','delivered',false,false, now() - interval '1 day 4 hours', now() - interval '1 day 4 hours'),
('acab352f-7602-4ed7-970e-b9f7e00cf40c','81b89e19-d7ef-4c9f-92c0-c00e9312bb7c','b4121b6c-180c-46a1-a6fa-61116c824dbf','inbound','Who is this? Where did you get my number?','received',false,false, now() - interval '1 day 3 hours', now() - interval '1 day 2 hours'),
('acab352f-7602-4ed7-970e-b9f7e00cf40c','81b89e19-d7ef-4c9f-92c0-c00e9312bb7c','b4121b6c-180c-46a1-a6fa-61116c824dbf','outbound','This is Dana with LeadTrace — your listing came up in a public business directory. Happy to stop texting if now is not a good time.','delivered',false,true, now() - interval '1 day 2 hours 55 minutes', now() - interval '1 day 2 hours'),
-- Thread 3: not interested
('acab352f-7602-4ed7-970e-b9f7e00cf40c','81b89e19-d7ef-4c9f-92c0-c00e9312bb7c','e6fc8e24-b7ab-4e9e-a726-1c32351c3e6e','outbound','Hi — do you handle commercial rooftop units in Pasco?','delivered',false,false, now() - interval '2 days', now() - interval '2 days'),
('acab352f-7602-4ed7-970e-b9f7e00cf40c','81b89e19-d7ef-4c9f-92c0-c00e9312bb7c','e6fc8e24-b7ab-4e9e-a726-1c32351c3e6e','inbound','Not right now, maybe in the fall.','received',false,false, now() - interval '1 day 20 hours', NULL),
-- Thread 4: opt-out
('acab352f-7602-4ed7-970e-b9f7e00cf40c','81b89e19-d7ef-4c9f-92c0-c00e9312bb7c','268196ef-ea56-401e-ba80-5b1a3b8e1db9','outbound','Hi — quick question about your HVAC service in Pasco.','delivered',false,false, now() - interval '3 days', now() - interval '3 days'),
('acab352f-7602-4ed7-970e-b9f7e00cf40c','81b89e19-d7ef-4c9f-92c0-c00e9312bb7c','268196ef-ea56-401e-ba80-5b1a3b8e1db9','inbound','STOP','received',true,false, now() - interval '2 days 22 hours', now() - interval '2 days 21 hours'),
-- Thread 5: unread new reply
('acab352f-7602-4ed7-970e-b9f7e00cf40c','81b89e19-d7ef-4c9f-92c0-c00e9312bb7c','05c240bb-5ebe-4836-a602-82b39010ed2e','outbound','Hi — are you quoting new AC replacements in Pasco this month?','delivered',false,false, now() - interval '5 hours', now() - interval '5 hours'),
('acab352f-7602-4ed7-970e-b9f7e00cf40c','81b89e19-d7ef-4c9f-92c0-c00e9312bb7c','05c240bb-5ebe-4836-a602-82b39010ed2e','inbound','Send me pricing and I will take a look.','received',false,false, now() - interval '6 minutes', NULL);

INSERT INTO public.suppression (workspace_id, phone, reason)
SELECT 'acab352f-7602-4ed7-970e-b9f7e00cf40c', '+18142713627', 'inbound_stop'
WHERE NOT EXISTS (SELECT 1 FROM public.suppression WHERE workspace_id='acab352f-7602-4ed7-970e-b9f7e00cf40c' AND phone='+18142713627');