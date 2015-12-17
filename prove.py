#!/usr/bin/env python
# -*- coding: utf-8 -*-

from decimal import Decimal

import agate
import geojson

class DecimalDegrees(agate.Computation):
    def __init__(self, column_name):
        self._column_name = column_name

        super(DecimalDegrees, self).__init__()

    def get_computed_data_type(self, table):
        return agate.Number()

    def run(self, row):
        val = row[self._column_name]

        if not val:
            return None

        bits = val.split('°')
        degrees = Decimal(bits[0].strip())
        bits = bits[1].split("'")
        minutes = Decimal(bits[0].strip())
        pole = bits[1].strip()

        d = degrees + (minutes / 60)

        if pole == 'W' or pole == 'S':
            d = d * -1

        return d

def main():
    table = agate.Table.from_csv('data.csv')

    print(list(zip(table.column_names, table.column_types)))

    with_decimals = table.compute([
        ('year', agate.Formula(agate.Text(), lambda r: r['Date'].year)),
        ('lat', DecimalDegrees('Latitude')),
        ('lng', DecimalDegrees('Longitude')),
    ])

    with_decimals.to_csv('with_decimals.csv')

    by_year = with_decimals.group_by('year')
    by_usable = by_year.group_by(lambda r: r['lat'] is not None and r['lng'] is not None)

    by_year.aggregate([
        ('count', agate.Length())
    ]).print_csv()

    by_usable.aggregate([
        ('count', agate.Length())
    ]).print_table()

    data = {}

    for year, table in by_year.items():
        data[year] = []

        for row in table.rows:
            if not row['lat'] or not row['lng']:
                continue

            data[year].append(geojson.Point([float(row['lng']), float(row['lat'])]))

    with open('src/data/attacks.json', 'w') as f:
        geojson.dump(data, f, sort_keys=True)

if __name__ == '__main__':
    main()
