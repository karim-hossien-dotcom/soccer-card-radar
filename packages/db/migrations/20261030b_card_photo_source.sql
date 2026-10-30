-- Full photo of the owner's copy for grading (eBay listing photos of the purchased item); imagePath stays the card-only crop.
alter table "Card" add column if not exists "photoSourceFront" text, add column if not exists "photoSourceBack" text;
