import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateEventDto {
  @IsString({ message: 'Title must be a string' })
  @IsNotEmpty({ message: 'Title is required' })
  @MaxLength(255, { message: 'Title must be at most 255 characters long' })
  title!: string;

  @IsString({ message: 'Description must be a string' })
  @IsOptional()
  description?: string;

  @IsDateString({}, { message: 'Date must be a valid date string' })
  @IsNotEmpty({ message: 'Date is required' })
  date!: Date;

  @IsString({ message: 'Location must be a string' })
  @IsNotEmpty({ message: 'Location is required' })
  @MaxLength(255, { message: 'Location must be at most 255 characters long' })
  location!: string;

  @IsInt()
  @Min(1, { message: 'Capacity must be at least 1' })
  capacity!: number;

  @IsInt()
  @Min(0, { message: 'Price must be a non-negative number' })
  @IsOptional()
  price?: number;
}
