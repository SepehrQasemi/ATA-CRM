do $$
begin
  if exists (select 1 from public.pipeline_stages where name = 'Nouveau lead')
     and not exists (select 1 from public.pipeline_stages where name = 'New Lead') then
    update public.pipeline_stages set name = 'New Lead' where name = 'Nouveau lead';
  end if;

  if exists (select 1 from public.pipeline_stages where name = 'Echantillon envoye')
     and not exists (select 1 from public.pipeline_stages where name = 'Sample Sent') then
    update public.pipeline_stages set name = 'Sample Sent' where name = 'Echantillon envoye';
  end if;

  if exists (select 1 from public.pipeline_stages where name = 'Devis envoye')
     and not exists (select 1 from public.pipeline_stages where name = 'Quote Sent') then
    update public.pipeline_stages set name = 'Quote Sent' where name = 'Devis envoye';
  end if;

  if exists (select 1 from public.pipeline_stages where name = 'Negociation')
     and not exists (select 1 from public.pipeline_stages where name = 'Negotiation') then
    update public.pipeline_stages set name = 'Negotiation' where name = 'Negociation';
  end if;

  if exists (select 1 from public.pipeline_stages where name = 'Gagne')
     and not exists (select 1 from public.pipeline_stages where name = 'Won') then
    update public.pipeline_stages set name = 'Won' where name = 'Gagne';
  end if;

  if exists (select 1 from public.pipeline_stages where name = 'Perdu')
     and not exists (select 1 from public.pipeline_stages where name = 'Lost') then
    update public.pipeline_stages set name = 'Lost' where name = 'Perdu';
  end if;
end
$$;

update public.email_templates
set
  name = 'Welcome Lead',
  subject = 'Welcome - Thanks for your interest',
  body = 'Hello {{name}},\n\nThanks for your interest. Our team will contact you shortly to qualify your raw food ingredient needs.\n\nBest regards,\nSales Team',
  is_active = true
where event_type = 'welcome';

update public.email_templates
set
  name = 'Quote Follow-up 72h',
  subject = 'Quote follow-up',
  body = 'Hello {{name}},\n\nWe are following up on the quote shared 72 hours ago. Let us know your questions so we can finalize your order.\n\nBest regards,\nSales Team',
  is_active = true
where event_type = 'followup';

